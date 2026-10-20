import { context, print, requireAddress, run, send } from './common';

run(async () => {
  const { state, admin, connection, client } = context();
  const controller = requireAddress(state, 'assetAccessController');
  const role = requireAddress(state, 'userRole');
  const vault = requireAddress(state, 'vault');
  const before = await client.rbacProgram.account.userRole.fetch(role);
  const instruction = await client.modifyUserRoleIxn({
    user: admin.publicKey,
    assetAccessController: controller,
    userRole: role,
    name: before.name,
    allowedAdminIxs: before.allowedAdminIxs.toNumber(),
    allowedMediciIxs: before.allowedMediciIxs.toNumber(),
    multisigAuthority: vault,
  });
  const signature = await send(connection, [instruction], [admin]);
  print('UserRole configured with the Squads vault authority', {
    signature,
    account: await client.rbacProgram.account.userRole.fetch(role),
  });
});
