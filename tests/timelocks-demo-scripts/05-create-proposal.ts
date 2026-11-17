import * as multisig from '@sqds/multisig';
import { context, createAndApproveProposal, print, requireAddress, run, saveState } from './common';

run(async () => {
  const { state, admin, member, connection, client } = context();
  const multisigPda = requireAddress(state, 'multisig');
  const vault = requireAddress(state, 'vault');
  const userRole = requireAddress(state, 'userRole');
  const role = await client.rbacProgram.account.userRole.fetch(userRole);
  state.proposedRoleName = 'Governance approved';
  const instruction = await client.modifyUserRoleIxn({
    user: member.publicKey,
    gateAuthority: vault,
    assetAccessController: requireAddress(state, 'assetAccessController'),
    authorizedUserRole: userRole,
    userRole,
    name: state.proposedRoleName,
    allowedAdminIxs: role.allowedAdminIxs.toNumber(),
    allowedMediciIxs: role.allowedMediciIxs.toNumber(),
  });
  const transactionIndex = await createAndApproveProposal({
    connection,
    multisigPda,
    vaultPda: vault,
    member,
    feePayer: admin,
    instruction,
  });
  state.transactionIndex = transactionIndex.toString();
  saveState(state);
  const [proposalPda] = multisig.getProposalPda({ multisigPda, transactionIndex });
  print('Squads proposal created and approved', {
    multisig: multisigPda,
    transactionIndex,
    proposedRoleName: state.proposedRoleName,
    executeAfterSeconds: state.timeLock,
    account: await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda),
  });
});
