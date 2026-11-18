import * as anchor from '@anchor-lang/core';
import { assert } from 'chai';
import { Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
  AdminFlags,
  MediciFlags,
  RBAC_PROGRAM,
  LEGACY_USER_ROLE_DISCRIMINATOR,
  deriveUserRolePda,
} from '../client/src';
import {
  createGateContext,
  expectFailure,
  fixture,
  gateAuthorityProof,
  sendGated,
  sendTransaction,
  setAccount,
} from './utils';

anchor.setProvider(anchor.AnchorProvider.env());
const { BN } = anchor;
type Fixture = Awaited<ReturnType<typeof fixture>>;

// Original deployed Borsh schema and allocation, independent of the current SDK/IDL.
function legacyBytes(f: Fixture, id: number, master = false, users = [f.admin.publicKey]) {
  const name = Buffer.from(master ? 'Legacy master' : 'Emergency');
  const u32 = (value: number) => {
    const bytes = Buffer.alloc(4);
    bytes.writeUInt32LE(value);
    return bytes;
  };
  const u64 = (value: number) => new BN(value).toArrayLike(Buffer, 'le', 8);
  const payload = Buffer.concat([
    Buffer.from(LEGACY_USER_ROLE_DISCRIMINATOR),
    f.controller.toBuffer(),
    u64(id),
    u32(name.length),
    name,
    u64(master ? AdminFlags.ALL : 0),
    u64(master ? MediciFlags.ALL : MediciFlags.FREEZE_TOKEN_ACCOUNT),
    Buffer.from([Number(master)]),
    u32(users.length),
    ...users.map((user) => user.toBuffer()),
  ]);
  const allocation = Buffer.alloc(136 + users.length * 32, 0xa5);
  payload.copy(allocation);
  return allocation;
}

async function legacyAsset(context: Awaited<ReturnType<typeof createGateContext>>) {
  const f = await fixture(context, false);
  const controller = await f.client.rbacProgram.account.assetAccessController.fetch(f.controller);
  await setAccount(f.connection, f.controller, {
    data: await f.client.rbacProgram.coder.accounts.encode('assetAccessController', {
      ...controller,
      userRolesCount: new BN(3),
      hasMasterRole: true,
    }),
  });
  const child = deriveUserRolePda(new BN(3), f.controller); // Deleted ID 2 must not break discovery.
  await setAccount(f.connection, f.master, {
    owner: RBAC_PROGRAM,
    data: legacyBytes(f, 1, true),
    lamports: 10_000_000,
  });
  await setAccount(f.connection, child, { owner: RBAC_PROGRAM, data: legacyBytes(f, 3), lamports: 10_000_000 });
  return { ...f, child };
}

function migrationArgs(f: Fixture, userRole = f.master) {
  return {
    payer: f.admin.publicKey,
    user: f.admin.publicKey,
    assetAccessController: f.controller,
    userRole,
    authorizedUserRole: f.master,
    newGate: { authority: f.gate.authority, proof: gateAuthorityProof(f.gate) },
  };
}
const direct = (f: Fixture, ix: TransactionInstruction, signers = [f.admin]) =>
  sendTransaction(f.connection, new Transaction().add(ix), signers);

describe('User role migration', () => {
  let context: Awaited<ReturnType<typeof createGateContext>>;
  let f: Awaited<ReturnType<typeof legacyAsset>>;
  before(async () => {
    context = await createGateContext();
  });
  beforeEach(async () => {
    f = await legacyAsset(context);
  });

  it('preserves legacy admin access and reuses capacity across role edits', async () => {
    // Admin is neither a member nor a permission holder in the supplied legacy role.
    const data = legacyBytes(f, 3, false, [f.outsider.publicKey]);
    await setAccount(f.connection, f.child, {
      data,
      lamports: await f.connection.getMinimumBalanceForRentExemption(data.length),
    });
    const args = { ...migrationArgs(f, f.child), authorizedUserRole: f.child };
    const edit = { ...args, name: 'Edited', allowedAdminIxs: 0, allowedMediciIxs: MediciFlags.FREEZE_TOKEN_ACCOUNT };
    await expectFailure(
      direct(f, await f.client.modifyUserRoleIxn({ ...edit, user: f.outsider.publicKey }), [f.outsider]),
      'InvalidUserRole'
    );
    await direct(f, await f.client.modifyUserRoleIxn(edit));
    await expectFailure(
      direct(f, await f.client.modifyUserRoleIxn({ ...edit, newGateAuthority: null })),
      'MigrationRequired'
    );
    const assign = await f.client.assignUserRoleIxn({ ...args, usersToAssign: [f.admin.publicKey, f.admin.publicKey] });
    await direct(f, assign);
    const grown = (await f.connection.getAccountInfo(f.child))!;
    assert.equal(grown.data.length, 137 + 32 * 2);
    assert.equal(grown.lamports, await f.connection.getMinimumBalanceForRentExemption(grown.data.length));
    await direct(f, await f.client.removeUserRoleIxn({ ...args, usersToRemove: [f.admin.publicKey] }));
    const removed = (await f.connection.getAccountInfo(f.child))!;
    assert.equal((await f.client.userRoles.fetch(f.child)).users.length, 1);
    assert.equal(removed.data.length, grown.data.length);
    assert.equal(removed.lamports, grown.lamports);
    await direct(f, assign);
    const reused = (await f.connection.getAccountInfo(f.child))!;
    assert.equal(reused.data.length, grown.data.length);
    assert.equal(reused.lamports, grown.lamports);
    const role = await f.client.userRoles.fetch(f.child);
    assert.equal(role.name, 'Edited');
    assert.equal(role.version, 1);
    assert.equal(role.users.length, 2);
  });

  it('migrates an asset through the SDK, preserves state, activates gates, and resumes without work', async () => {
    const before = await f.client.userRoles.all(f.controller);
    assert.deepEqual(
      before.map(({ account }) => account.id.toNumber()),
      [1, 3]
    );
    assert(before.every(({ account }) => account.version === 1 && account.gateAuthority === null));
    const controller = (await f.connection.getAccountInfo(f.controller))!.data;
    await expectFailure(
      f.client.userRoles.planMigration({ ...migrationArgs(f), gates: {} }),
      'Missing migration gate configuration'
    );
    const plan = await f.client.userRoles.planMigration({
      ...migrationArgs(f),
      gates: { [f.master.toBase58()]: migrationArgs(f).newGate, [f.child.toBase58()]: null },
    });
    assert(
      plan.pending.every(({ instruction }) => !instruction.keys.some(({ pubkey }) => pubkey.equals(f.gate.authority)))
    );
    await sendTransaction(f.connection, new Transaction().add(...plan.pending.map(({ instruction }) => instruction)), [
      f.admin,
    ]);
    const after = await f.client.userRoles.all(f.controller);
    for (let i = 0; i < before.length; i++) {
      const { version: oldVersion, gateAuthority: oldGate, ...oldFields } = before[i].account;
      const { version, gateAuthority, ...fields } = after[i].account;
      assert.equal(version, 2);
      assert.deepEqual(fields, oldFields);
    }
    assert((await f.client.userRoles.fetch(f.master)).gateAuthority!.equals(f.gate.authority));
    assert.isNull((await f.client.userRoles.fetch(f.child)).gateAuthority);
    assert((await f.connection.getAccountInfo(f.controller))!.data.equals(controller));
    const resumed = await f.client.userRoles.planMigration({ ...migrationArgs(f), gates: {} });
    assert.lengthOf(resumed.pending, 0);
    assert.lengthOf(resumed.alreadyMigrated, 2);
    const edit = (asset: Fixture, gateAuthority?: PublicKey) =>
      asset.client.modifyUserRoleIxn({
        ...migrationArgs(asset),
        gateAuthority,
        name: 'Changed',
        allowedAdminIxs: AdminFlags.ALL,
        allowedMediciIxs: MediciFlags.ALL,
      });
    await expectFailure(direct(f, await edit(f)), 'MissingGateAuthority');
    await sendGated(f.connection, f.gate, f.admin, await edit(f, f.gate.authority));
    const other = await legacyAsset(context);
    await direct(other, await edit(other));
    assert.equal((await f.client.userRoles.fetch(other.master)).version, 1);
  });

  it('rejects unauthorized migration, missing gates, invalid proofs, and cross-controller roles', async () => {
    const before = (await f.connection.getAccountInfo(f.master))!;
    await expectFailure(
      direct(
        f,
        await f.client.userRoles.migrateIxn({
          ...migrationArgs(f),
          user: f.outsider.publicKey,
          newGate: null,
        }),
        [f.admin, f.outsider]
      ),
      'InvalidMasterRole'
    );
    await expectFailure(
      direct(f, await f.client.userRoles.migrateIxn({ ...migrationArgs(f), newGate: null })),
      'MissingGateAuthority'
    );
    await expectFailure(
      direct(
        f,
        await f.client.userRoles.migrateIxn({
          ...migrationArgs(f),
          newGate: {
            authority: f.gate.authority,
            proof: { ...gateAuthorityProof(f.gate), seeds: [Buffer.from('wrong')] },
          },
        })
      ),
      'InvalidGateAuthorityProof'
    );
    const other = await legacyAsset(context);
    await expectFailure(
      direct(
        f,
        await f.client.userRoles.migrateIxn({
          ...migrationArgs(f),
          assetAccessController: other.controller,
          authorizedUserRole: undefined,
        })
      ),
      'ConstraintSeeds'
    );
    const unchanged = (await f.connection.getAccountInfo(f.master))!;
    assert(unchanged.data.equals(before.data));
    assert.equal(unchanged.lamports, before.lamports);
  });

  it('supports voided admins, then requires the migrated master gate signer', async () => {
    await direct(
      f,
      await f.client.updateControllerAdminIxn({
        admin: f.admin.publicKey,
        newAdmin: PublicKey.default,
        assetAccessController: f.controller,
        authorizedUserRole: f.master,
      })
    );
    await direct(f, await f.client.userRoles.migrateIxn(migrationArgs(f)));
    await expectFailure(
      direct(f, await f.client.userRoles.migrateIxn({ ...migrationArgs(f, f.child), newGate: null })),
      'MissingGateAuthority'
    );
    const approved = await f.client.userRoles.migrateIxn({
      ...migrationArgs(f, f.child),
      gateAuthority: f.gate.authority,
      newGate: null,
    });
    const unsigned = new TransactionInstruction({
      ...approved,
      keys: approved.keys.map((key) => (key.pubkey.equals(f.gate.authority) ? { ...key, isSigner: false } : key)),
    });
    await expectFailure(direct(f, unsigned), 'AccountNotSigner');
    await sendGated(f.connection, f.gate, f.admin, approved);
    assert.equal((await f.client.userRoles.fetch(f.child)).version, 2);
  });

  it('tops up rent and preserves a large users vector', async () => {
    const users = Array.from({ length: 100 }, () => Keypair.generate().publicKey);
    users[0] = f.admin.publicKey;
    const data = legacyBytes(f, 1, true, users);
    await setAccount(f.connection, f.master, {
      data,
      lamports: await f.connection.getMinimumBalanceForRentExemption(data.length),
    });
    await direct(f, await f.client.userRoles.migrateIxn(migrationArgs(f)));
    const info = (await f.connection.getAccountInfo(f.master))!;
    assert.equal(info.data.length, 171 + users.length * 32);
    assert.isAtLeast(info.lamports, await f.connection.getMinimumBalanceForRentExemption(info.data.length));
    assert.deepEqual(
      (await f.client.userRoles.fetch(f.master)).users.map((user) => user.toBase58()),
      users.map((user) => user.toBase58())
    );
  });

  it('migrates after removals, preserving survivors and refunding excess rent to its payer', async () => {
    const users = [
      f.admin.publicKey,
      f.outsider.publicKey,
      ...Array.from({ length: 6 }, () => Keypair.generate().publicKey),
    ];
    const data = legacyBytes(f, 3, false, users);
    const lamports = (await f.connection.getMinimumBalanceForRentExemption(data.length)) + 1234;
    await setAccount(f.connection, f.child, { data, lamports });
    await direct(f, await f.client.removeUserRoleIxn({ ...migrationArgs(f, f.child), usersToRemove: users.slice(2) }));
    const removed = (await f.connection.getAccountInfo(f.child))!;
    assert.equal(removed.data.length, data.length);
    assert.equal(removed.lamports, lamports);
    assert.isTrue(removed.data.includes(users[7].toBuffer())); // Removed users can remain in unused bytes.
    const payerBefore = await f.connection.getBalance(f.outsider.publicKey);
    await direct(
      f,
      await f.client.userRoles.migrateIxn({
        ...migrationArgs(f, f.child),
        payer: f.outsider.publicKey,
        newGate: null,
      }),
      [f.admin, f.outsider]
    );
    const migrated = (await f.connection.getAccountInfo(f.child))!;
    const minimum = await f.connection.getMinimumBalanceForRentExemption(171 + 32 * 2);
    assert.equal(migrated.data.length, 171 + 32 * 2);
    assert.equal(migrated.lamports, minimum);
    assert.equal(await f.connection.getBalance(f.outsider.publicKey), payerBefore + lamports - minimum);
    const role = await f.client.userRoles.fetch(f.child);
    assert.equal(role.version, 2);
    assert.deepEqual(
      role.users.map((user) => user.toBase58()),
      users.slice(0, 2).map((user) => user.toBase58())
    );
  });
});
