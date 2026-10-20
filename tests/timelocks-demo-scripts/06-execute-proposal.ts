import * as multisig from '@sqds/multisig';
import { context, executeProposal, print, requireAddress, run } from './common';

run(async () => {
  const { state, admin, member, connection, client } = context();
  if (!state.transactionIndex) throw new Error('Transaction index is missing. Run 05-create-proposal.ts first.');
  const multisigPda = requireAddress(state, 'multisig');
  const transactionIndex = BigInt(state.transactionIndex);
  const [proposalPda] = multisig.getProposalPda({ multisigPda, transactionIndex });
  try {
    const signature = await executeProposal({
      connection,
      multisigPda,
      transactionIndex,
      member,
      feePayer: admin,
    });
    const controller = await client.rbacProgram.account.assetAccessController.fetch(
      requireAddress(state, 'assetAccessController')
    );
    if (!controller.lutAddress.equals(requireAddress(state, 'lutAddress')))
      throw new Error('LUT address was not updated');
    print('Timelocked proposal executed successfully', {
      signature,
      controller,
      proposal: await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda),
    });
  } catch (error) {
    const message = String(error);
    if (!message.includes('TimeLockNotReleased')) throw error;
    print('Expected failure: Squads has not released the timelock', {
      error: 'TimeLockNotReleased',
      proposal: await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda),
    });
  }
});
