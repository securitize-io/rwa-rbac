import * as anchor from '@anchor-lang/core';
import { assert } from 'chai';
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import * as squads from '@sqds/multisig';
import { AdminFlags, MediciFlags, RBAC_PROGRAM } from '../client/src';
import {
  adminArgs,
  createGateContext,
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

describe('Gated admin instructions', () => {
  let context: Awaited<ReturnType<typeof createGateContext>>;
  let f: Awaited<ReturnType<typeof fixture>>;
  before(async () => {
    context = await createGateContext();
  });
  beforeEach(async () => {
    f = await fixture(context);
  });
  const send = (ix: anchor.web3.TransactionInstruction) => sendGated(f.connection, f.gate, f.admin, ix);
  const direct = (ix: anchor.web3.TransactionInstruction, signers = [f.admin]) =>
    sendTransaction(f.connection, new Transaction().add(ix), signers);
  async function child(changes: Record<string, unknown> = {}) {
    await send(
      await f.client.createUserRoleIxn({
        ...adminArgs(f),
        name: 'Operators',
        allowedAdminIxs: AdminFlags.ALL,
        allowedMediciIxs: MediciFlags.ALL,
        newGateAuthority: f.gate.authority,
        newGateAuthorityProof: gateAuthorityProof(f.gate),
        ...changes,
      })
    );
  }
  async function modify(changes: Record<string, unknown> = {}, target = f.master) {
    const role = await f.client.rbacProgram.account.userRole.fetch(target);
    return f.client.modifyUserRoleIxn({
      ...adminArgs(f),
      userRole: target,
      name: role.name,
      allowedAdminIxs: role.allowedAdminIxs.toNumber(),
      allowedMediciIxs: role.allowedMediciIxs.toNumber(),
      ...changes,
    });
  }

  it('bootstraps a usable master through the Squads vault and prevents a second master', async () => {
    const role = await f.client.rbacProgram.account.userRole.fetch(f.master);
    assert(role.isMasterRole && role.users[0].equals(f.admin.publicKey));
    assert(role.gateAuthority!.equals(f.gate.authority));
    assert((await f.client.rbacProgram.account.assetAccessController.fetch(f.controller)).hasMasterRole);
    await expectFailure(child({ isMasterRole: true }), 'InvalidMasterRole');
  });

  it('requires the admin and gate signer for bootstrap, with no later admin-only fallback', async () => {
    const fresh = await fixture(context, false);
    const args = {
      ...adminArgs(fresh),
      name: 'Governance',
      isMasterRole: true,
      allowedAdminIxs: AdminFlags.ALL,
      allowedMediciIxs: MediciFlags.ALL,
      newGateAuthority: fresh.gate.authority,
      newGateAuthorityProof: gateAuthorityProof(fresh.gate),
      authorizedUserRole: undefined,
    };
    await expectFailure(
      direct(
        omitNewAuthority(await fresh.client.createUserRoleIxn({ ...args, gateAuthority: undefined }), 'createUserRole')
      ),
      'MissingGateAuthority'
    );
    await expectFailure(
      send(
        await f.client.createUserRoleIxn({
          ...adminArgs(f),
          authorizedUserRole: undefined,
          name: 'Bypass',
          allowedAdminIxs: 0,
          allowedMediciIxs: 0,
        })
      ),
      'InvalidUserRole'
    );
    assert.isNull(await fresh.connection.getAccountInfo(fresh.master));
  });

  it('validates membership, names, flags and cross-controller relationships', async () => {
    await expectFailure(child({ allowedAdminIxs: 1 << 20 }), 'InvalidFlags');
    for (const name of ['x'.repeat(65), '😊']) await expectFailure(send(await modify({ name })), 'InvalidName');
    await send(await modify({ name: 'x'.repeat(64) }));
    await child();
    await expectFailure(send(await modify({ authorizedUserRole: f.child })), 'InvalidUserRole');
    const other = await fixture(context);
    await expectFailure(send(await modify({ authorizedUserRole: other.master })), 'ConstraintHasOne');
  });

  it('fails closed for missing/wrong/non-signing authorities', async () => {
    await expectFailure(direct(await modify({ gateAuthority: undefined })), 'MissingGateAuthority');
    const wrong = await modify({ gateAuthority: f.outsider.publicKey });
    await expectFailure(direct(wrong, [f.admin, f.outsider]), 'InvalidGateAuthority');
    const unsigned = await modify();
    unsigned.keys.forEach((key) => {
      if (key.pubkey.equals(f.gate.authority)) key.isSigner = false;
    });
    await expectFailure(direct(unsigned), 'AccountNotSigner');
  });

  it('preserves NoChange and requires the existing authority for rotation/removal', async () => {
    await send(await modify({ name: 'Renamed' }));
    assert((await f.client.rbacProgram.account.userRole.fetch(f.master)).gateAuthority!.equals(f.gate.authority));
    await child();
    await storeRole(f, { gateAuthority: f.outsider.publicKey }, f.child);
    await expectFailure(send(await modify({ newGateAuthority: null }, f.child)), 'InvalidGateAuthority');
    await storeRole(f, { gateAuthority: f.gate.authority }, f.child);
    await send(await modify({ newGateAuthority: null }, f.child));
    assert.isNull((await f.client.rbacProgram.account.userRole.fetch(f.child)).gateAuthority);
  });

  it('supports nonzero vault indices and rotation approved by the previous gate', async () => {
    const next = {
      ...f.gate,
      authority: squads.getVaultPda({ multisigPda: f.gate.account, index: 1 })[0],
      vaultIndex: 1,
    };
    // Nest the proposed vault's execution inside the current vault's execution,
    // so both PDAs consent in the same instruction without forging signer privilege.
    async function rotate(current: typeof next, proposed: typeof next) {
      const ix = await modify({
        gateAuthority: current.authority,
        newGateAuthority: proposed.authority,
        newGateAuthorityProof: gateAuthorityProof(proposed),
      });
      const index = await propose(f.connection, proposed, f.admin, ix);
      const { instruction } = await squads.instructions.vaultTransactionExecute({
        connection: f.connection,
        multisigPda: proposed.account,
        transactionIndex: index,
        member: f.admin.publicKey,
      });
      await sendGated(f.connection, current, f.admin, instruction);
    }
    await rotate(f.gate, next);
    assert((await f.client.rbacProgram.account.userRole.fetch(f.master)).gateAuthority!.equals(next.authority));
    await rotate(next, f.gate);
    assert((await f.client.rbacProgram.account.userRole.fetch(f.master)).gateAuthority!.equals(f.gate.authority));
  });

  function omitNewAuthority(ix: anchor.web3.TransactionInstruction, name: string) {
    const definition = f.client.rbacProgram.idl.instructions.find((entry) => entry.name === name)!;
    const index = definition.accounts.findIndex((entry) => entry.name === 'newGateAuthority');
    ix.keys[index] = { pubkey: RBAC_PROGRAM, isSigner: false, isWritable: false };
    return ix;
  }

  it('rejects ordinary wallets even when they consent to bootstrap', async () => {
    const fresh = await fixture(context, false);
    const ix = await fresh.client.createUserRoleIxn({
      ...adminArgs(fresh),
      authorizedUserRole: undefined,
      name: 'Invalid wallet gate',
      isMasterRole: true,
      allowedAdminIxs: AdminFlags.ALL,
      allowedMediciIxs: MediciFlags.ALL,
      newGateAuthority: fresh.outsider.publicKey,
      newGateAuthorityProof: gateAuthorityProof(fresh.gate),
      gateAuthority: undefined,
    });
    await expectFailure(direct(ix, [fresh.admin, fresh.outsider]), 'InvalidGateAuthorityProof');
    assert.isNull(await fresh.connection.getAccountInfo(fresh.master));
  });

  it('requires a derivation proof at bootstrap and on subsequent creation', async () => {
    const fresh = await fixture(context, false);
    await expectFailure(
      send(
        await fresh.client.createUserRoleIxn({
          ...adminArgs(fresh),
          authorizedUserRole: undefined,
          name: 'Missing proof',
          isMasterRole: true,
          allowedAdminIxs: AdminFlags.ALL,
          allowedMediciIxs: MediciFlags.ALL,
          newGateAuthority: fresh.gate.authority,
        })
      ),
      'MissingGateAuthorityProof'
    );
    await expectFailure(child({ newGateAuthorityProof: undefined }), 'MissingGateAuthorityProof');
    assert.isNull(await fresh.connection.getAccountInfo(fresh.master));
    assert.isNull(await f.connection.getAccountInfo(f.child));
  });

  it('requires proposed-authority consent on creation and modification', async () => {
    const create = await f.client.createUserRoleIxn({
      ...adminArgs(f),
      name: 'Missing consent',
      allowedAdminIxs: 0,
      allowedMediciIxs: 0,
      newGateAuthority: f.gate.authority,
      newGateAuthorityProof: gateAuthorityProof(f.gate),
    });
    await expectFailure(send(omitNewAuthority(create, 'createUserRole')), 'MissingGateAuthority');
    const update = await modify({
      newGateAuthority: f.gate.authority,
      newGateAuthorityProof: gateAuthorityProof(f.gate),
    });
    await expectFailure(send(omitNewAuthority(update, 'modifyUserRole')), 'MissingGateAuthority');
    assert.isNull(await f.connection.getAccountInfo(f.child));
  });

  for (const [name, mutate, error] of [
    [
      'unapproved program',
      (proof: ReturnType<typeof gateAuthorityProof>) => ({ ...proof, programId: RBAC_PROGRAM }),
      'InvalidGatingProgram',
    ],
    [
      'system program',
      (proof: ReturnType<typeof gateAuthorityProof>) => ({ ...proof, programId: SystemProgram.programId }),
      'InvalidGatingProgram',
    ],
    [
      'different multisig',
      (proof: ReturnType<typeof gateAuthorityProof>) => ({
        ...proof,
        seeds: proof.seeds.map((seed, index) => (index === 1 ? Keypair.generate().publicKey.toBuffer() : seed)),
      }),
      'InvalidGateAuthorityProof',
    ],
    [
      'different vault index',
      (proof: ReturnType<typeof gateAuthorityProof>) => ({
        ...proof,
        seeds: proof.seeds.map((seed, index) => (index === 3 ? Buffer.from([1]) : seed)),
      }),
      'InvalidGateAuthorityProof',
    ],
    [
      'wrong bump',
      (proof: ReturnType<typeof gateAuthorityProof>) => ({
        ...proof,
        seeds: proof.seeds.map((seed, index) => (index === 4 ? Buffer.from([(seed[0] + 1) % 256]) : seed)),
      }),
      'InvalidGateAuthorityProof',
    ],
    [
      'oversized seed',
      (proof: ReturnType<typeof gateAuthorityProof>) => ({ ...proof, seeds: [Buffer.alloc(33)] }),
      'InvalidGateAuthorityProof',
    ],
    [
      'too many seeds',
      (proof: ReturnType<typeof gateAuthorityProof>) => ({
        ...proof,
        seeds: Array.from({ length: 17 }, () => Buffer.alloc(0)),
      }),
      'InvalidGateAuthorityProof',
    ],
  ] as const) {
    it(`rejects ${name} on creation and replacement without changing role state`, async () => {
      const proof = mutate(gateAuthorityProof(f.gate));
      await expectFailure(child({ newGateAuthorityProof: proof }), error);
      const before = await f.connection.getAccountInfo(f.master);
      await expectFailure(
        send(
          await modify({
            name: 'Must roll back',
            newGateAuthority: f.gate.authority,
            newGateAuthorityProof: proof,
          })
        ),
        error
      );
      assert.deepEqual((await f.connection.getAccountInfo(f.master))!.data, before!.data);
      assert.isNull(await f.connection.getAccountInfo(f.child));
    });
  }

  it('allows creating an ungated role and later installing a proven authority', async () => {
    await child({ newGateAuthority: null, newGateAuthorityProof: undefined });
    assert.isNull((await f.client.rbacProgram.account.userRole.fetch(f.child)).gateAuthority);
    await send(
      await modify({ newGateAuthority: f.gate.authority, newGateAuthorityProof: gateAuthorityProof(f.gate) }, f.child)
    );
    assert((await f.client.rbacProgram.account.userRole.fetch(f.child)).gateAuthority!.equals(f.gate.authority));
  });

  for (const flag of [AdminFlags.ASSIGN_OR_REMOVE_ANY_USER_ROLE, AdminFlags.ASSIGN_OR_REMOVE_CURRENT_ROLE]) {
    it(`gates both assignment and removal under permission ${flag}`, async () => {
      await child({ allowedAdminIxs: flag });
      await storeRole(f, { users: [f.admin.publicKey] }, f.child);
      const args = { ...adminArgs(f), userRole: f.child, authorizedUserRole: f.child };
      await expectFailure(
        direct(
          await f.client.assignUserRoleIxn({ ...args, usersToAssign: [f.outsider.publicKey], gateAuthority: undefined })
        ),
        'MissingGateAuthority'
      );
      await send(
        await f.client.assignUserRoleIxn({ ...args, usersToAssign: [f.outsider.publicKey, f.outsider.publicKey] })
      );
      assert.equal((await f.client.rbacProgram.account.userRole.fetch(f.child)).users.length, 2);
      const grown = (await f.connection.getAccountInfo(f.child))!;
      assert.equal(grown.data.length, 171 + 32 * 2);
      await expectFailure(
        direct(
          await f.client.removeUserRoleIxn({ ...args, usersToRemove: [f.outsider.publicKey], gateAuthority: undefined })
        ),
        'MissingGateAuthority'
      );
      await send(await f.client.removeUserRoleIxn({ ...args, usersToRemove: [f.outsider.publicKey] }));
      assert.equal((await f.client.rbacProgram.account.userRole.fetch(f.child)).users.length, 1);
      const removed = (await f.connection.getAccountInfo(f.child))!;
      assert.equal(removed.data.length, grown.data.length);
      assert.equal(removed.lamports, grown.lamports);
    });
  }

  it('gates deletion/withdrawal and retains master-role safety checks', async () => {
    await expectFailure(
      send(
        await f.client.removeUserRoleIxn({ ...adminArgs(f), userRole: f.master, usersToRemove: [f.admin.publicKey] })
      ),
      'CannotEmptyMasterRole'
    );
    await expectFailure(
      send(await f.client.deleteUserRoleIxn({ ...adminArgs(f), userRole: f.master, receiver: f.admin.publicKey })),
      'CannotDeleteMasterRole'
    );
    await child();
    const del = { ...adminArgs(f), userRole: f.child, receiver: f.admin.publicKey };
    await expectFailure(
      direct(await f.client.deleteUserRoleIxn({ ...del, gateAuthority: undefined })),
      'MissingGateAuthority'
    );
    await send(await f.client.deleteUserRoleIxn(del));
    assert.isNull(await f.connection.getAccountInfo(f.child));
    await setAccount(f.connection, f.controllerAuthority, {
      owner: SystemProgram.programId,
      data: Buffer.alloc(0),
      lamports: 1_000_000,
    });
    const withdraw = {
      ...adminArgs(f),
      admin: f.admin.publicKey,
      receiver: f.outsider.publicKey,
      controllerAuthority: f.controllerAuthority,
    };
    await expectFailure(
      direct(await f.client.withdrawExcessRentIxn({ ...withdraw, gateAuthority: undefined })),
      'MissingGateAuthority'
    );
    const before = await f.connection.getBalance(f.outsider.publicKey);
    await send(await f.client.withdrawExcessRentIxn(withdraw));
    assert.equal(await f.connection.getBalance(f.outsider.publicKey), before + 1_000_000);
  });

  it('requires the current admin, master membership and its gate for admin rotation, without a flag', async () => {
    const args = {
      admin: f.admin.publicKey,
      assetAccessController: f.controller,
      authorizedUserRole: f.master,
      gateAuthority: f.gate.authority,
      newAdmin: f.outsider.publicKey,
    };
    await expectFailure(
      direct(await f.client.updateControllerAdminIxn({ ...args, gateAuthority: undefined })),
      'MissingGateAuthority'
    );
    await child();
    await expectFailure(
      send(await f.client.updateControllerAdminIxn({ ...args, authorizedUserRole: f.child })),
      'InvalidMasterRole'
    );
    await send(
      await f.client.assignUserRoleIxn({ ...adminArgs(f), userRole: f.master, usersToAssign: [f.outsider.publicKey] })
    );
    await send(await f.client.updateControllerAdminIxn(args));
    assert(
      (await f.client.rbacProgram.account.assetAccessController.fetch(f.controller)).admin.equals(f.outsider.publicKey)
    );
  });

  it('updates the LUT without a gate while requiring the admin to hold role membership and permission', async () => {
    const lutAddress = f.outsider.publicKey;
    const ix = await f.client.setLookuptableAddressIxn({
      signer: f.admin.publicKey.toBase58(),
      assetAccessController: f.controller,
      authorizedUserRole: f.master,
      lutAddress,
    });
    await storeRole(f, { gateAuthority: null });
    await direct(ix);
    assert(
      (await f.client.rbacProgram.account.assetAccessController.fetch(f.controller)).lutAddress.equals(lutAddress)
    );

    await storeRole(f, { allowedAdminIxs: new anchor.BN(AdminFlags.ALL & ~AdminFlags.SET_LUT_ADDRESS) });
    await expectFailure(direct(ix), 'InvalidUserRole');
    await storeRole(f, { allowedAdminIxs: new anchor.BN(AdminFlags.ALL), users: [] });
    await expectFailure(direct(ix), 'InvalidUserRole');
    const other = await fixture(context);
    await expectFailure(
      direct(
        await f.client.setLookuptableAddressIxn({
          signer: f.admin.publicKey.toBase58(),
          assetAccessController: f.controller,
          authorizedUserRole: other.master,
          lutAddress,
        })
      ),
      'ConstraintHasOne'
    );
  });
});
