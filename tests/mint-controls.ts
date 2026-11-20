import * as anchor from '@anchor-lang/core';
import { assert } from 'chai';
import { readFileSync } from 'fs';
import { ComputeBudgetProgram, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import {
  getAssetControllerPda,
  getIdentityAccountPda,
  getTrackerAccount,
  getTrackerAccountPda,
} from '@dstoken-solana/rwa-token-sdk';
import {
  LEGACY_USER_ROLE_DISCRIMINATOR,
  MediciFlags,
  computeFlags,
  generateOperationId,
  getPendingOperationPda,
} from '../client/src';
import {
  adminArgs,
  advanceSurfpoolClock,
  createGateContext,
  execute,
  expectFailure,
  fixture,
  gateAuthorityProof,
  propose,
  sendGated,
  sendTransaction,
  setAccount,
  storeRole,
} from './utils';

anchor.setProvider(anchor.AnchorProvider.env());
const { BN } = anchor;
type Fixture = Awaited<ReturnType<typeof fixture>>;
const zero = new BN(0);
const caps = { maxMintPerTx: new BN(500), maxBurnPerTx: new BN(500) };
const throttle = {
  enabled: true,
  mintWindowCap: new BN(500),
  burnWindowCap: new BN(500),
  windowSeconds: new BN(3600),
  largeAmountThreshold: new BN(100),
  largeAmountDelay: new BN(60),
  pendingOperationGracePeriod: new BN(120),
};
const auth = (f: Fixture, role = f.master) => ({
  user: f.admin.publicKey,
  assetMint: f.mint,
  assetAccessController: f.controller,
  authorizedUserRole: role,
});
const mc = (f: Fixture) => f.client.assetController.mintControls;
const direct = (f: Fixture, ixs: TransactionInstruction | TransactionInstruction[], signer = f.admin) =>
  sendTransaction(
    f.connection,
    new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
      ...(Array.isArray(ixs) ? ixs : [ixs])
    ),
    signer === f.admin ? [f.admin] : [f.admin, signer]
  );
const configure = async (f: Fixture, limits = throttle) =>
  sendGated(f.connection, f.gate, f.admin, [
    await mc(f).setCapsConfigIx({ ...auth(f), gateAuthority: f.gate.authority, caps }),
    await mc(f).setThrottleConfigIx({ ...auth(f), gateAuthority: f.gate.authority, throttle: limits }),
  ]);
async function mint(f: Fixture, amount: number) {
  return direct(
    f,
    await f.client.assetController.issueTokenIxns(
      {
        payer: f.admin.publicKey.toBase58(),
        signer: f.admin.publicKey.toBase58(),
        wallet: f.outsider.publicKey.toBase58(),
        assetMint: f.mint.toBase58(),
        investorId: 'a'.repeat(32),
        amount: new BN(amount),
        issuanceTimestamp: zero,
      },
      f.controller,
      f.child
    )
  );
}
async function burn(f: Fixture, amount: number) {
  return direct(
    f,
    await f.client.assetController.revokeTokenIxn(
      {
        owner: f.outsider.publicKey.toBase58(),
        wallet: f.outsider.publicKey.toBase58(),
        authority: f.controllerAuthority.toBase58(),
        assetMint: f.mint.toBase58(),
        amount: new BN(amount),
        reason: 'redemption',
      },
      f.admin.publicKey,
      f.controller,
      f.child
    )
  );
}
async function balance(f: Fixture) {
  const ata = getAssociatedTokenAddressSync(f.mint, f.outsider.publicKey, true, TOKEN_2022_PROGRAM_ID);
  const info = await f.connection.getAccountInfo(ata);
  return info ? (await getAccount(f.connection, ata, 'confirmed', TOKEN_2022_PROGRAM_ID)).amount : BigInt(0);
}
async function proposal(f: Fixture, kind: 'mint' | 'burn' = 'mint') {
  const id = generateOperationId();
  const args = { ...auth(f, f.child), payer: f.admin.publicKey, wallet: f.outsider.publicKey };
  const ix =
    kind === 'mint'
      ? await mc(f).proposeMintIx({ ...args, request: { id: [...id], amount: new BN(300), issuanceTimestamp: zero } })
      : await mc(f).proposeBurnIx({
          ...args,
          request: { id: [...id], amount: new BN(300), reason: 'delayed redemption' },
        });
  await direct(f, ix);
  return {
    id,
    ix,
    pending: (await mc(f).getPendingOperation(f.mint, id))!,
    args: { ...auth(f, f.child), payer: f.admin.publicKey, operationId: id },
  };
}
async function operationalRole(f: Fixture) {
  await sendGated(f.connection, f.gate, f.admin, [
    await f.client.createUserRoleIxn({
      ...adminArgs(f),
      name: 'Supply operator',
      allowedAdminIxs: 0,
      allowedMediciIxs: computeFlags(MediciFlags.ISSUE_TOKENS, MediciFlags.REVOKE_TOKENS),
    }),
    await f.client.assignUserRoleIxn({ ...adminArgs(f), userRole: f.child, usersToAssign: [f.admin.publicKey] }),
  ]);
}

describe('Token supply controls through RBAC', () => {
  let context: Awaited<ReturnType<typeof createGateContext>>;
  let f: Fixture;
  before(async () => {
    const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync('tests/testSigner.json', 'utf8'))));
    context = await createGateContext(0, 0, admin);
  });
  beforeEach(async () => {
    f = await fixture(context, true, true);
    await operationalRole(f);
    const setup = await f.client.identityRegistry.setupUserIxns(
      {
        payer: f.admin.publicKey.toBase58(),
        signer: f.admin.publicKey.toBase58(),
        assetMint: f.mint.toBase58(),
        owner: f.outsider.publicKey.toBase58(),
        levels: [1],
        expiry: [new BN('9223372036854775807')],
        country: 0,
      },
      f.controller,
      f.master,
      f.gate.authority
    );
    await sendGated(f.connection, f.gate, f.admin, setup.ixs);
  });

  it('gates configuration, checks membership/permission, and composes unsigned flags', async () => {
    assert.equal(computeFlags(MediciFlags.CANCEL_PENDING_OPERATIONS, MediciFlags.ISSUE_TOKENS), 2147483656);
    assert.equal(computeFlags(MediciFlags.ALL), 4294967295);
    await expectFailure(direct(f, await mc(f).setCapsConfigIx({ ...auth(f), caps })), 'MissingGateAuthority');
    await expectFailure(
      direct(f, await mc(f).setCapsConfigIx({ ...auth(f), caps, gateAuthority: f.outsider.publicKey }), f.outsider),
      'InvalidGateAuthority'
    );
    await expectFailure(
      sendGated(
        f.connection,
        f.gate,
        f.admin,
        await mc(f).setCapsConfigIx({
          ...auth(f, f.child),
          caps,
          gateAuthority: f.gate.authority,
        })
      ),
      'InvalidUserRole'
    );
    await storeRole(f, { users: [] });
    await expectFailure(
      sendGated(
        f.connection,
        f.gate,
        f.admin,
        await mc(f).setCapsConfigIx({
          ...auth(f),
          caps,
          gateAuthority: f.gate.authority,
        })
      ),
      'InvalidUserRole'
    );
    await storeRole(f, { users: [f.admin.publicKey] });
    const masterInfo = (await f.connection.getAccountInfo(f.master))!;
    const role = await f.client.rbacProgram.account.userRole.fetch(f.master);
    const name = Buffer.from(role.name),
      length = Buffer.alloc(4);
    length.writeUInt32LE(name.length);
    const count = Buffer.alloc(4);
    count.writeUInt32LE(role.users.length);
    await setAccount(f.connection, f.master, {
      data: Buffer.concat([
        Buffer.from(LEGACY_USER_ROLE_DISCRIMINATOR),
        role.assetAccessController.toBuffer(),
        role.id.toArrayLike(Buffer, 'le', 8),
        length,
        name,
        role.allowedAdminIxs.toArrayLike(Buffer, 'le', 8),
        role.allowedMediciIxs.toArrayLike(Buffer, 'le', 8),
        Buffer.from([1]),
        count,
        ...role.users.map((u) => u.toBuffer()),
      ]),
    });
    await expectFailure(
      sendGated(
        f.connection,
        f.gate,
        f.admin,
        await mc(f).setCapsConfigIx({
          ...auth(f),
          caps,
          gateAuthority: f.gate.authority,
        })
      ),
      'MigrationRequired'
    );
    await setAccount(f.connection, f.master, { data: masterInfo.data });
    const capsIx = await mc(f).setCapsConfigIx({ ...auth(f), caps, gateAuthority: f.gate.authority });
    const wrongConfig = new TransactionInstruction({
      ...capsIx,
      data: f.client.rbacProgram.coder.instruction.encode('setCapsConfig', {
        cpiData: mc(f).tokenProgram.coder.instruction.encode('setThrottleConfig', { throttle }),
      }),
    });
    await expectFailure(sendGated(f.connection, f.gate, f.admin, wrongConfig), 'UnknownInstruction');
    await configure(f);
    const state = await mc(f).getAssetController(f.mint);
    assert(state.version === 2);
    assert(state.caps.maxMintPerTx.eq(caps.maxMintPerTx));
    assert.isTrue(state.throttle.enabled);
  });

  it('enforces immediate mint/burn caps through writable CPIs and preserves counters on failure', async () => {
    await configure(f, { ...throttle, largeAmountThreshold: zero });
    await mint(f, 100);
    await burn(f, 40);
    await expectFailure(mint(f, 501), 'OperationCapExceeded');
    await expectFailure(mint(f, 401), 'WindowCapExceeded');
    assert.equal(await balance(f), BigInt(60));
    const state = await mc(f).getAssetController(f.mint);
    assert(state.version === 2);
    assert.equal(state.state.mintedInWindow.toNumber(), 100);
    assert.equal(state.state.burnedInWindow.toNumber(), 40);
  });

  it('executes a saved mint only after release and with current mint permission and membership', async () => {
    await configure(f);
    const p = await proposal(f);
    const wrongProposal = new TransactionInstruction({
      ...p.ix,
      data: f.client.rbacProgram.coder.instruction.encode('proposeMint', {
        cpiData: mc(f).tokenProgram.coder.instruction.encode('proposeBurn', {
          request: { id: [...p.id], amount: new BN(300), reason: 'wrong instruction' },
        }),
      }),
    });
    await expectFailure(direct(f, wrongProposal), 'UnknownInstruction');
    assert.equal(await balance(f), BigInt(0));
    await expectFailure(direct(f, p.ix), 'already in use');
    const ixs = await mc(f).executePendingIxs(p.args);
    assert.lengthOf(ixs, 2);
    const forged = new TransactionInstruction({
      ...ixs[1],
      keys: ixs[1].keys.map((key) =>
        key.pubkey.equals(getPendingOperationPda(f.mint, p.id)) ? { ...key, pubkey: f.master } : key
      ),
    });
    await expectFailure(direct(f, forged), 'AccountOwnedByWrongProgram');
    await expectFailure(direct(f, ixs), 'PendingOperationNotEffective');
    await storeRole(f, { allowedMediciIxs: new BN(MediciFlags.REVOKE_TOKENS) }, f.child);
    await expectFailure(direct(f, ixs), 'InvalidUserRole');
    await storeRole(f, { allowedMediciIxs: new BN(MediciFlags.ISSUE_TOKENS), users: [] }, f.child);
    await advanceSurfpoolClock(f.connection, 61);
    await expectFailure(direct(f, ixs), 'InvalidUserRole');
    await storeRole(f, { users: [f.admin.publicKey] }, f.child);
    const signature = await direct(f, ixs);
    const transaction = await f.connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    const events = [
      ...new anchor.EventParser(f.client.rbacProgram.programId, f.client.rbacProgram.coder).parseLogs(
        transaction!.meta!.logMessages!
      ),
    ];
    const event = events.find((event) => event.name === 'tokenOperationExecuted')!;
    assert(event.data.user.equals(f.admin.publicKey));
    assert.equal(event.data.roleId.toNumber(), 2);
    assert.equal(await balance(f), BigInt(300));
    assert.isNull(await mc(f).getPendingOperation(f.mint, p.id));
    const state = await mc(f).getAssetController(f.mint);
    assert(state.version === 2);
    assert.equal(state.state.mintedInWindow.toNumber(), 300);
  });

  it('selects burn permission from stored state and rechecks caps at delayed execution', async () => {
    await mint(f, 400); // Controllers start disabled.
    await configure(f);
    await expectFailure(burn(f, 101), 'AmountRequiresTimelock');
    const p = await proposal(f, 'burn');
    const ixs = await mc(f).executePendingIxs(p.args);
    assert.lengthOf(ixs, 1);
    await storeRole(f, { allowedMediciIxs: new BN(MediciFlags.ISSUE_TOKENS) }, f.child);
    await advanceSurfpoolClock(f.connection, 61);
    await expectFailure(direct(f, ixs), 'InvalidUserRole');
    await storeRole(f, { allowedMediciIxs: new BN(MediciFlags.REVOKE_TOKENS) }, f.child);
    await sendGated(
      f.connection,
      f.gate,
      f.admin,
      await mc(f).setCapsConfigIx({
        ...auth(f),
        gateAuthority: f.gate.authority,
        caps: { ...caps, maxBurnPerTx: new BN(200) },
      })
    );
    await expectFailure(direct(f, ixs), 'OperationCapExceeded');
    assert.equal(await balance(f), BigInt(400));
    assert.isNotNull(await mc(f).getPendingOperation(f.mint, p.id));
    const state = await mc(f).getAssetController(f.mint);
    assert(state.version === 2);
    assert.equal(state.state.burnedInWindow.toNumber(), 0);
    await sendGated(
      f.connection,
      f.gate,
      f.admin,
      await mc(f).setCapsConfigIx({ ...auth(f), gateAuthority: f.gate.authority, caps })
    );
    await direct(f, ixs);
    assert.equal(await balance(f), BigInt(100));
  });

  it('cancels immediately with only the cancellation permission and refunds the original payer', async () => {
    await configure(f);
    const p = await proposal(f);
    await expectFailure(direct(f, await mc(f).cancelPendingIx(p.args)), 'InvalidUserRole');
    await storeRole(f, { allowedMediciIxs: new BN(MediciFlags.CANCEL_PENDING_OPERATIONS) }, f.child);
    const rent = await f.connection.getBalance(getPendingOperationPda(f.mint, p.id));
    const before = await f.connection.getBalance(f.admin.publicKey);
    await direct(f, await mc(f).cancelPendingIx(p.args));
    assert.isNull(await mc(f).getPendingOperation(f.mint, p.id));
    assert.equal(await balance(f), BigInt(0));
    assert.equal(await f.connection.getBalance(f.admin.publicKey), before + rent - 5000);
  });

  it('allows permissionless expiry with its fixed refund destination', async () => {
    await configure(f);
    const p = await proposal(f);
    const ix = await mc(f).expirePendingIx({ assetMint: f.mint, operationId: p.id });
    const expire = () => sendTransaction(f.connection, new Transaction().add(ix), [f.outsider]);
    await expectFailure(expire(), 'PendingOperationNotExpired');
    await advanceSurfpoolClock(f.connection, 181);
    await expectFailure(direct(f, await mc(f).executePendingIxs(p.args)), 'PendingOperationExpired');
    await expire();
    assert.isNull(await mc(f).getPendingOperation(f.mint, p.id));
  });

  it('uses the saved identity tracker for an attached wallet across delayed mint and burn', async () => {
    const attached = Keypair.generate().publicKey;
    await direct(
      f,
      await f.client.identityRegistry.attachWalletToIdentityIxn(
        {
          payer: f.admin.publicKey.toBase58(),
          signer: f.admin.publicKey.toBase58(),
          assetMint: f.mint.toBase58(),
          owner: f.outsider.publicKey.toBase58(),
          wallet: attached.toBase58(),
        },
        f.controller,
        f.master
      )
    );
    await configure(f);
    const id = generateOperationId();
    await direct(
      f,
      await mc(f).proposeMintIx({
        ...auth(f, f.child),
        payer: f.admin.publicKey,
        wallet: attached,
        request: { id: [...id], amount: new BN(300), issuanceTimestamp: zero },
      })
    );
    const pending = (await mc(f).getPendingOperation(f.mint, id))!;
    assert(pending.identityAccount.equals(getIdentityAccountPda(f.mint.toBase58(), f.outsider.publicKey.toBase58())));
    await advanceSurfpoolClock(f.connection, 61);
    await direct(f, await mc(f).executePendingIxs({ ...auth(f, f.child), payer: f.admin.publicKey, operationId: id }));
    const burnId = generateOperationId();
    await direct(
      f,
      await mc(f).proposeBurnIx({
        ...auth(f, f.child),
        payer: f.admin.publicKey,
        wallet: attached,
        request: { id: [...burnId], amount: new BN(200), reason: 'attached wallet' },
      })
    );
    await advanceSurfpoolClock(f.connection, 61);
    await direct(
      f,
      await mc(f).executePendingIxs({ ...auth(f, f.child), payer: f.admin.publicKey, operationId: burnId })
    );
    const tracker = await getTrackerAccount(f.mint.toBase58(), f.outsider.publicKey.toBase58(), f.client.provider);
    assert.equal(tracker!.totalAmount.toNumber(), 100);
  });

  it('keeps exact and padded V1 assets operational alongside a controlled V2 asset', async () => {
    const controlled = await fixture(context, true, true);
    await configure(controlled);
    const controlledAddress = getAssetControllerPda(controlled.mint.toBase58());
    const controlledData = (await f.connection.getAccountInfo(controlledAddress))!.data;
    const address = getAssetControllerPda(f.mint.toBase58());
    const original = (await f.connection.getAccountInfo(address))!.data;
    const migration = { ...auth(f), gateAuthority: f.gate.authority, payer: f.admin.publicKey, caps, throttle };
    for (const length of [73, 162]) {
      const legacy = Buffer.alloc(length, 0xa5);
      original.subarray(0, 73).copy(legacy);
      legacy[8] = 1;
      await setAccount(f.connection, address, { data: legacy });
      const state = await mc(f).getAssetController(f.mint);
      assert(state.version === 1);
      assert(state.assetMint.equals(f.mint));
      assert(state.authority.equals(f.controllerAuthority));
      assert.notProperty(state, 'caps');
      assert.notProperty(state, 'throttle');
      assert.notProperty(state, 'state');
      assert.lengthOf(await mc(f).migrateAndConfigureIxs(migration), 3);
      await mint(f, 600); // V1 has neither the V2 hard cap nor the large-amount delay.
      await burn(f, 100);
      await expectFailure(configure(f), 'AssetControllerMigrationRequired');
      for (const kind of ['mint', 'burn'] as const)
        await expectFailure(proposal(f, kind), 'AssetControllerMigrationRequired');
      assert.deepEqual((await f.connection.getAccountInfo(address))!.data, legacy);
    }
    assert.equal(await balance(f), BigInt(1000));
    assert.deepEqual((await f.connection.getAccountInfo(controlledAddress))!.data, controlledData);
    const state = await mc(controlled).getAssetController(controlled.mint);
    assert(state.version === 2);
    assert.isTrue(state.throttle.enabled);
  });

  it('migrates padded legacy controllers and configures atomically; planning is resumable', async () => {
    const address = getAssetControllerPda(f.mint.toBase58());
    const info = (await f.connection.getAccountInfo(address))!;
    const legacy = Buffer.alloc(162, 0xa5);
    info.data.subarray(0, 73).copy(legacy);
    legacy[8] = 1;
    await setAccount(f.connection, address, { data: legacy });
    const args = { ...auth(f), gateAuthority: f.gate.authority, payer: f.admin.publicKey, caps, throttle };
    const batch = await mc(f).migrateAndConfigureIxs(args);
    assert.lengthOf(batch, 3);
    const invalid = await mc(f).migrateAndConfigureIxs({ ...args, throttle: { ...throttle, windowSeconds: zero } });
    await expectFailure(sendGated(f.connection, f.gate, f.admin, invalid), 'InvalidMintControlsConfig');
    assert.deepEqual((await f.connection.getAccountInfo(address))!.data, legacy);
    await expectFailure(
      sendGated(
        f.connection,
        f.gate,
        f.admin,
        await mc(f).migrateAssetControllerIx({
          ...args,
          authorizedUserRole: f.child,
        })
      ),
      'InvalidMasterRole'
    );
    await sendGated(f.connection, f.gate, f.admin, batch);
    assert.equal((await f.connection.getAccountInfo(address))!.data.length, 162);
    const current = await mc(f).getAssetController(f.mint);
    assert(current.version === 2);
    assert(current.authority.equals(f.controllerAuthority));
    assert.isTrue(current.throttle.enabled);
    assert.lengthOf(await mc(f).migrateAndConfigureIxs(args), 0);
    await expectFailure(
      sendGated(f.connection, f.gate, f.admin, await mc(f).migrateAssetControllerIx(args)),
      'InvalidLegacyAssetController'
    );
    await mint(f, 100);
  });
});
