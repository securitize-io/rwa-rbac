import { context, fund, initializeState, print, run } from './common';

run(async () => {
  const state = initializeState();
  const { admin, member, assetMint, connection } = context(state);
  await Promise.all([fund(connection, admin.publicKey), fund(connection, member.publicKey)]);
  print('Demo initialized', {
    rpcUrl: connection.rpcEndpoint,
    admin: admin.publicKey,
    member: member.publicKey,
    assetMint: assetMint.publicKey,
    lutAddress: state.lutAddress,
    timeLockSeconds: state.timeLock,
  });
});
