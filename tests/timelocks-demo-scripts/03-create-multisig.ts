import * as multisig from '@sqds/multisig';
import { context, createSquads, print, run, saveState } from './common';

run(async () => {
  const { state, member, connection } = context();
  const created = await createSquads({
    connection,
    creator: member,
    members: [member.publicKey],
    timeLock: state.timeLock,
  });
  state.multisig = created.multisigPda.toBase58();
  state.vault = created.vaultPda.toBase58();
  saveState(state);
  print('Squads multisig created', {
    multisig: created.multisigPda,
    vault: created.vaultPda,
    account: await multisig.accounts.Multisig.fromAccountAddress(connection, created.multisigPda),
  });
});
