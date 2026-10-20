import * as multisig from '@sqds/multisig';
import { PublicKey } from '@solana/web3.js';
import { context, print, run } from './common';

run(async () => {
  const { state, admin, member, assetMint, connection, client } = context();
  print('Demo addresses', {
    admin: admin.publicKey,
    member: member.publicKey,
    assetMint: assetMint.publicKey,
    lutAddress: state.lutAddress,
    assetAccessController: state.assetAccessController,
    userRole: state.userRole,
    multisig: state.multisig,
    vault: state.vault,
    transactionIndex: state.transactionIndex,
  });

  if (state.assetAccessController) {
    const address = new PublicKey(state.assetAccessController);
    if (await connection.getAccountInfo(address)) {
      print('AssetAccessController', await client.rbacProgram.account.assetAccessController.fetch(address));
    }
  }
  if (state.userRole) {
    const address = new PublicKey(state.userRole);
    if (await connection.getAccountInfo(address)) {
      print('UserRole', await client.rbacProgram.account.userRole.fetch(address));
    }
  }
  if (state.multisig) {
    const multisigPda = new PublicKey(state.multisig);
    if (await connection.getAccountInfo(multisigPda)) {
      print('Squads Multisig', await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda));
    }
  }
  if (state.multisig && state.transactionIndex) {
    const multisigPda = new PublicKey(state.multisig);
    const [proposalPda] = multisig.getProposalPda({
      multisigPda,
      transactionIndex: BigInt(state.transactionIndex),
    });
    if (await connection.getAccountInfo(proposalPda)) {
      print('Squads Proposal', await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda));
    }
  }
});
