import * as multisig from '@sqds/multisig';
import { context, createAndApproveProposal, print, requireAddress, run, saveState } from './common';

run(async () => {
  const { state, admin, member, connection, client } = context();
  const multisigPda = requireAddress(state, 'multisig');
  const vault = requireAddress(state, 'vault');
  const instruction = await client.setLookuptableAddressIxn({
    signer: member.publicKey.toBase58(),
    multisigAuthority: vault,
    assetAccessController: requireAddress(state, 'assetAccessController'),
    authorizedUserRole: requireAddress(state, 'userRole'),
    lutAddress: requireAddress(state, 'lutAddress'),
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
    lutAddress: state.lutAddress,
    executeAfterSeconds: state.timeLock,
    account: await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda),
  });
});
