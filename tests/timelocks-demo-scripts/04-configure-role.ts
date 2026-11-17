import { context, print, requireAddress, run } from './common';

run(async () => {
  const { state, client } = context();
  const role = await client.rbacProgram.account.userRole.fetch(requireAddress(state, 'userRole'));
  if (!role.gateAuthority?.equals(requireAddress(state, 'vault'))) throw new Error('Unexpected role gate authority');
  print('Role gate authority verified', { account: role });
});
