import { BN } from '@anchor-lang/core';
import { AdminFlags, deriveUserRolePda, MediciFlags } from '../../client/src';
import { context, print, requireAddress, run, saveState, send } from './common';

run(async () => {
  const { state, admin, member, connection, client } = context();
  const controller = requireAddress(state, 'assetAccessController');
  const role = deriveUserRolePda(new BN(1), controller);
  const createInstruction = await client.createUserRoleIxn({
    payer: admin.publicKey,
    user: admin.publicKey,
    assetAccessController: controller,
    name: 'Timelocked LUT Manager',
    allowedAdminIxs: AdminFlags.SET_LUT_ADDRESS,
    allowedMediciIxs: MediciFlags.NONE,
  });
  const assignInstruction = await client.assignUserRoleIxn({
    payer: admin.publicKey,
    user: admin.publicKey,
    userRole: role,
    usersToAssign: [member.publicKey],
    assetAccessController: controller,
  });
  const signature = await send(connection, [createInstruction, assignInstruction], [admin]);
  state.userRole = role.toBase58();
  saveState(state);
  print('UserRole created and member assigned (authority is intentionally unset)', {
    signature,
    address: role,
    account: await client.rbacProgram.account.userRole.fetch(role),
  });
});
