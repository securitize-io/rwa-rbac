import * as anchor from '@anchor-lang/core';
import { BN } from '@anchor-lang/core';
import { assert } from 'chai';
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getPolicyEngineAccount } from '@dstoken-solana/rwa-token-sdk';
import { readFileSync } from 'fs';
import { AdminFlags, MediciFlags, RBAC_PROGRAM } from '../client/src';
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
const permissions = [
  ['updateAssetMetadata', MediciFlags.UPDATE_ASSET_METADATA],
  ['attachToPolicyEngine', MediciFlags.ATTACH_TO_POLICY_ACCOUNT],
  ['detachFromPolicyEngine', MediciFlags.DETACH_FROM_POLICY_ACCOUNT],
  ['changeCounterLimits', MediciFlags.CHANGE_COUNTER_LIMITS],
  ['changeCounters', MediciFlags.CHANGE_COUNTERS],
  ['setCounters', MediciFlags.CHANGE_COUNTERS],
  ['changeMapping', MediciFlags.CHANGE_MAPPING],
  ['changeIssuancePolicies', MediciFlags.CHANGE_ISSUANCE_POLICIES],
  ['createIdentityAccount', MediciFlags.CREATE_IDENTITY_ACCOUNT],
] as const;

// Invalid downstream bytes isolate authorization without reproducing every asset fixture.
// tests/cpiTests.ts exercises successful downstream operations with actual state.
async function boundary(f: Awaited<ReturnType<typeof fixture>>, name: string, gate: PublicKey | null) {
  const definition = f.client.rbacProgram.idl.instructions.find((ix) => ix.name === name)!;
  const accounts: Record<string, PublicKey | null> = {};
  for (const entry of definition.accounts as any[])
    accounts[entry.name] = entry.address ? new PublicKey(entry.address) : Keypair.generate().publicKey;
  Object.assign(accounts, {
    user: f.admin.publicKey,
    payer: f.admin.publicKey,
    assetAccessController: f.controller,
    authorizedUserRole: f.master,
    controllerAuthority: f.controllerAuthority,
  });
  if ('gateAuthority' in accounts) accounts.gateAuthority = gate;
  if ('systemProgram' in accounts) accounts.systemProgram = SystemProgram.programId;
  if ('tokenProgram' in accounts) accounts.tokenProgram = TOKEN_2022_PROGRAM_ID;
  if ('associatedTokenProgram' in accounts) accounts.associatedTokenProgram = ASSOCIATED_TOKEN_PROGRAM_ID;
  if ('program' in accounts) accounts.program = RBAC_PROGRAM;
  if (name === 'removeIdentityAccount') {
    accounts.identityOwner = f.admin.publicKey;
    const data = Buffer.alloc(128);
    f.admin.publicKey.toBuffer().copy(data, 41);
    await setAccount(f.connection, accounts.identityAccount!, {
      owner: SystemProgram.programId,
      data,
      lamports: 10_000_000,
    });
  }
  return (f.client.rbacProgram.methods as any)
    [name](...(definition.args.length ? [Buffer.alloc(8)] : []))
    .accountsStrict(accounts)
    .instruction() as Promise<TransactionInstruction>;
}

describe('Permission gates', () => {
  let context: Awaited<ReturnType<typeof createGateContext>>;
  let f: Awaited<ReturnType<typeof fixture>>;
  before(async () => {
    context = await createGateContext();
  });
  beforeEach(async () => {
    f = await fixture(context);
  });
  const direct = (ix: TransactionInstruction, signers = [f.admin]) =>
    sendTransaction(f.connection, new Transaction().add(ix), signers);
  for (const [name, flag] of permissions) {
    it(`${name}: requires the configured signer and current permission`, async () => {
      await expectFailure(direct(await boundary(f, name, null)), 'MissingGateAuthority');
      await expectFailure(
        direct(await boundary(f, name, f.outsider.publicKey), [f.admin, f.outsider]),
        'InvalidGateAuthority'
      );
      const ix = await boundary(f, name, f.gate.authority);
      await expectFailure(sendGated(f.connection, f.gate, f.admin, ix), 'UnknownInstruction');
      await storeRole(f, { allowedMediciIxs: new BN(MediciFlags.ALL & ~flag) });
      await expectFailure(sendGated(f.connection, f.gate, f.admin, ix), 'InvalidUserRole');
    });
  }
  for (const [name, flag] of [
    ['issueTokens', MediciFlags.ISSUE_TOKENS],
    ['freezeTokenAccount', MediciFlags.FREEZE_TOKEN_ACCOUNT],
    ['addLock', MediciFlags.ADD_TOKEN_LOCK],
    ['seizeTokens', MediciFlags.SEIZE_TOKENS],
    ['revokeTokens', MediciFlags.REVOKE_TOKENS],
    ['thawTokenAccount', MediciFlags.THAW_TOKEN_ACCOUNT],
    ['removeLock', MediciFlags.REMOVE_TOKEN_LOCK],
    ['changeCountry', MediciFlags.CHANGE_COUNTRY],
    ['removeLevels', MediciFlags.REMOVE_LEVELS],
    ['addLevels', MediciFlags.ADD_LEVELS],
    ['registerInvestor', MediciFlags.REGISTER_INVESTOR],
    ['removeIdentityAccount', MediciFlags.REMOVE_IDENTITY_ACCOUNT],
  ] as const) {
    it(`${name}: executes without a gate but still requires permission and membership`, async () => {
      // Keep a configured gate: immediate operations must not inherit its delay.
      const ix = await boundary(f, name, null);
      await expectFailure(direct(ix), 'UnknownInstruction');
      await storeRole(f, { allowedMediciIxs: new BN(MediciFlags.ALL & ~flag) });
      await expectFailure(direct(ix), 'InvalidUserRole');
      await storeRole(f, { allowedMediciIxs: new BN(MediciFlags.ALL), users: [] });
      await expectFailure(direct(ix), 'InvalidUserRole');
    });
  }

  it('removeInvestor: ungated cleanup still requires permission and membership', async () => {
    const ix = await boundary(f, 'removeInvestor', null);
    await storeRole(f, { allowedMediciIxs: new BN(MediciFlags.ALL & ~MediciFlags.REMOVE_INVESTOR) });
    await expectFailure(direct(ix), 'InvalidUserRole');
    await storeRole(f, { allowedMediciIxs: new BN(MediciFlags.ALL), users: [] });
    await expectFailure(direct(ix), 'InvalidUserRole');
  });
});

describe('Squads timelock integration', () => {
  let context: Awaited<ReturnType<typeof createGateContext>>;
  let f: Awaited<ReturnType<typeof fixture>>;
  before(async () => {
    const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync('tests/testSigner.json', 'utf8'))));
    context = await createGateContext(60, 0, admin);
  });
  beforeEach(async () => {
    f = await fixture(context, false, true);
    const bootstrap = await f.client.createUserRoleIxn({
      ...adminArgs(f),
      name: 'Governance',
      allowedAdminIxs: AdminFlags.ALL,
      allowedMediciIxs: MediciFlags.ALL,
      isMasterRole: true,
      newGateAuthority: f.gate.authority,
      newGateAuthorityProof: gateAuthorityProof(f.gate),
      authorizedUserRole: undefined,
    });
    const index = await propose(f.connection, f.gate, f.admin, bootstrap);
    await advanceSurfpoolClock(f.connection, 61);
    await execute(f.connection, f.gate, f.admin, index);
  });

  it('delays admin rotation and preserves controller state until release', async () => {
    const ix = await f.client.updateControllerAdminIxn({
      admin: f.admin.publicKey,
      assetAccessController: f.controller,
      authorizedUserRole: f.master,
      gateAuthority: f.gate.authority,
      newAdmin: f.outsider.publicKey,
    });
    const index = await propose(f.connection, f.gate, f.admin, ix);
    await expectFailure(execute(f.connection, f.gate, f.admin, index), 'TimeLockNotReleased');
    assert(
      (await f.client.rbacProgram.account.assetAccessController.fetch(f.controller)).admin.equals(f.admin.publicKey)
    );
    await advanceSurfpoolClock(f.connection, 61);
    await execute(f.connection, f.gate, f.admin, index);
    assert(
      (await f.client.rbacProgram.account.assetAccessController.fetch(f.controller)).admin.equals(f.outsider.publicKey)
    );
    await expectFailure(execute(f.connection, f.gate, f.admin, index), 'InvalidProposalStatus');
  });

  it('delays an actual issuance-policy change', async () => {
    const policies = {
      disallowBackdating: true,
      maxSupply: new BN(123456),
      usLockPeriod: new BN(60),
      nonUsLockPeriod: new BN(30),
    };
    const ix = await f.client.policyEngine.changeIssuancePolicies(
      {
        payer: f.admin.publicKey.toBase58(),
        authority: f.controllerAuthority.toBase58(),
        assetMint: f.mint.toBase58(),
        issuancePolicies: policies,
      },
      f.admin.publicKey,
      f.controller,
      f.master,
      f.gate.authority
    );
    const before = await getPolicyEngineAccount(f.mint.toBase58(), f.client.provider);
    const index = await propose(f.connection, f.gate, f.admin, ix);
    await expectFailure(execute(f.connection, f.gate, f.admin, index), 'TimeLockNotReleased');
    assert(
      (await getPolicyEngineAccount(f.mint.toBase58(), f.client.provider)).issuancePolicies.maxSupply.eq(
        before.issuancePolicies.maxSupply
      )
    );
    await advanceSurfpoolClock(f.connection, 61);
    await execute(f.connection, f.gate, f.admin, index);
    assert(
      (await getPolicyEngineAccount(f.mint.toBase58(), f.client.provider)).issuancePolicies.maxSupply.eq(
        policies.maxSupply
      )
    );
  });

  for (const revoke of ['membership', 'authority'] as const) {
    it(`rechecks ${revoke} when an approved request executes`, async () => {
      const role = await f.client.rbacProgram.account.userRole.fetch(f.master);
      const ix = await f.client.modifyUserRoleIxn({
        user: f.admin.publicKey,
        gateAuthority: f.gate.authority,
        assetAccessController: f.controller,
        authorizedUserRole: f.master,
        userRole: f.master,
        name: 'Must not execute',
        allowedAdminIxs: role.allowedAdminIxs.toNumber(),
        allowedMediciIxs: role.allowedMediciIxs.toNumber(),
      });
      const index = await propose(f.connection, f.gate, f.admin, ix);
      await storeRole(
        f,
        revoke === 'membership' ? { users: [f.outsider.publicKey] } : { gateAuthority: f.outsider.publicKey }
      );
      await advanceSurfpoolClock(f.connection, 61);
      await expectFailure(
        execute(f.connection, f.gate, f.admin, index),
        revoke === 'membership' ? 'InvalidUserRole' : 'InvalidGateAuthority'
      );
      assert.equal((await f.client.rbacProgram.account.userRole.fetch(f.master)).name, role.name);
    });
  }
});
