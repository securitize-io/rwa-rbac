import { BN } from '@anchor-lang/core';
import * as squads from '@sqds/multisig';
import { AdminFlags, deriveUserRolePda, MediciFlags } from '../../client/src';
import {
  advanceClock,
  context,
  createAndApproveProposal,
  executeProposal,
  print,
  requireAddress,
  run,
  saveState,
} from './common';

run(async () => {
  const { state, admin, member, connection, client } = context();
  const controller = requireAddress(state, 'assetAccessController');
  const vault = requireAddress(state, 'vault');
  const gatingAccount = requireAddress(state, 'multisig');
  const role = deriveUserRolePda(new BN(1), controller);
  const vaultIndex = 0;
  const [, bump] = squads.getVaultPda({ multisigPda: gatingAccount, index: vaultIndex });
  const create = await client.createUserRoleIxn({
    payer: admin.publicKey,
    user: admin.publicKey,
    assetAccessController: controller,
    name: 'Governance',
    isMasterRole: true,
    allowedAdminIxs: AdminFlags.ALL,
    allowedMediciIxs: MediciFlags.ALL,
    newGateAuthority: vault,
    newGateAuthorityProof: {
      programId: squads.PROGRAM_ID,
      seeds: [
        Buffer.from('multisig'),
        gatingAccount.toBuffer(),
        Buffer.from('vault'),
        Buffer.from([vaultIndex]),
        Buffer.from([bump]),
      ],
    },
    gateAuthority: vault,
  });
  const createIndex = await createAndApproveProposal({
    connection,
    multisigPda: gatingAccount,
    vaultPda: vault,
    member: admin,
    feePayer: admin,
    instruction: create,
  });
  await advanceClock(connection, state.timeLock + 1);
  await executeProposal({
    connection,
    multisigPda: gatingAccount,
    transactionIndex: createIndex,
    member: admin,
    feePayer: admin,
  });
  const assign = await client.assignUserRoleIxn({
    payer: admin.publicKey,
    user: admin.publicKey,
    assetAccessController: controller,
    authorizedUserRole: role,
    gateAuthority: vault,
    userRole: role,
    usersToAssign: [member.publicKey],
  });
  const assignIndex = await createAndApproveProposal({
    connection,
    multisigPda: gatingAccount,
    vaultPda: vault,
    member: admin,
    feePayer: admin,
    instruction: assign,
  });
  await advanceClock(connection, state.timeLock + 1);
  await executeProposal({
    connection,
    multisigPda: gatingAccount,
    transactionIndex: assignIndex,
    member: admin,
    feePayer: admin,
  });
  state.userRole = role.toBase58();
  saveState(state);
  print('Master role bootstrapped through its gate authority', {
    address: role,
    account: await client.rbacProgram.account.userRole.fetch(role),
  });
});
