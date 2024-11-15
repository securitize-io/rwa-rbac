import * as anchor from "@coral-xyz/anchor";
import { BN, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { setupTests } from "./setup";
import {
  generateUniqueSeed,
  RwaRbacClient,
  AdminFlags,
  MediciFlags,
  computeFlags,
} from "../client/src/index";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
  getAssetControllerPda,
  getPolicyEnginePda,
  getPolicyAccountPda,
} from "@bridgesplit/rwa-token-sdk";

describe("Admin Ixs Test", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  let rwaRbacClient: RwaRbacClient;
  let setup;
  let connection: Connection;

  before(async () => {
    setup = await setupTests(generateUniqueSeed());
    connection = setup.config.connection;
    rwaRbacClient = new RwaRbacClient(setup.config, new Wallet(setup.payerKp));
  });

  it("Create AssetAccessController successfully", async () => {
    const ix = await rwaRbacClient.createAssetAccessControllerIxn({
      payer: setup.payer,
      admin: setup.signer1,
      uniqueSeed: setup.uniqueSeed,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);
    const controllerAccount =
      await rwaRbacClient.rbacProgram.account.assetAccessController.fetch(
        setup.assetAccessController
      );
    assert(
      controllerAccount.controllerAuthority.equals(setup.controllerAuthority)
    );
    assert.equal(
      controllerAccount.controllerAuthorityBump,
      setup.controllerAuthorityBump
    );
    assert(controllerAccount.admin.equals(setup.signer1));
    assert(controllerAccount.uniqueSeed.eq(new anchor.BN(setup.uniqueSeed)));
    assert(controllerAccount.userRolesCount.eqn(0));
  });

  it("Create UserRole 1 successfully", async () => {
    const name = "Role1";
    const allowedAdminIxs = computeFlags(AdminFlags.CREATE_OR_DELETE_USER_ROLE);
    const allowedMediciIxs = computeFlags(
      MediciFlags.ADD_LEVEL_TO_IDENTITY_ACCOUNT
    );

    const ix = await rwaRbacClient.createUserRoleIxn({
      name,
      allowedAdminIxs,
      allowedMediciIxs,
      payer: setup.payer,
      user: setup.signer1,
      assetAccessController: setup.assetAccessController,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    const userRoleAccount =
      await rwaRbacClient.rbacProgram.account.userRole.fetch(setup.userRole1);
    assert(
      userRoleAccount.assetAccessController.equals(setup.assetAccessController)
    );
    assert(userRoleAccount.id.eq(setup.roleId1));
    assert.equal(userRoleAccount.name, name);
    assert(userRoleAccount.allowedAdminIxs.eqn(allowedAdminIxs));
    assert(userRoleAccount.allowedMediciIxs.eqn(allowedMediciIxs));
    assert.equal(userRoleAccount.users.length, 0);

    const controllerAccount =
      await rwaRbacClient.rbacProgram.account.assetAccessController.fetch(
        setup.assetAccessController
      );
    assert(controllerAccount.userRolesCount.eqn(1));
  });

  it("Fails to create UserRole if unauthorized", async () => {
    try {
      const name = "Role2";
      const allowedAdminIxs = AdminFlags.NONE;
      const allowedMediciIxs = MediciFlags.NONE;

      // Signer 2 is not a controller admin and has not been added to a valid role.
      const ix = await rwaRbacClient.createUserRoleIxn({
        name,
        allowedAdminIxs,
        allowedMediciIxs,
        payer: setup.payer,
        user: setup.signer2,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
      });
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
        setup.payerKp,
        setup.signer2Kp,
      ]);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
        setup.payerKp,
        setup.signer2Kp,
      ]);
      assert(false);
    } catch (err) {
      // TODO: Match for error
      // console.error(err);
    }
  });

  it("Assign users to UserRole 1 successfully", async () => {
    const userRoleDataLenPre = (
      await connection.getAccountInfo(setup.userRole1, "processed")
    ).data.length;
    const ix = await rwaRbacClient.assignUserRoleIxn({
      usersToAssign: [setup.signer2, setup.signer3, setup.payer],
      userRole: setup.userRole1,
      payer: setup.payer,
      user: setup.signer1,
      assetAccessController: setup.assetAccessController,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    const userRoleAccount =
      await rwaRbacClient.rbacProgram.account.userRole.fetch(setup.userRole1);
    const userRoleDataLenPost = (
      await connection.getAccountInfo(setup.userRole1)
    ).data.length;
    assert.equal(userRoleDataLenPost - userRoleDataLenPre, 96);
    assert.equal(userRoleAccount.users.length, 3);
    assert(userRoleAccount.users[0].equals(setup.signer2));
    assert(userRoleAccount.users[1].equals(setup.signer3));
    assert(userRoleAccount.users[2].equals(setup.payer));
  });

  it("Remove users from UserRole 1 successfully", async () => {
    const ix = await rwaRbacClient.removeUserRoleIxn({
      user: setup.signer1, // Admin Key
      assetAccessController: setup.assetAccessController,
      userRole: setup.userRole1,
      usersToRemove: [setup.payer, setup.signer3],
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.signer1Kp,
    ]);

    const userRoleAccount =
      await rwaRbacClient.rbacProgram.account.userRole.fetch(setup.userRole1);
    assert.equal(userRoleAccount.users.length, 1);
    assert(userRoleAccount.users[0].equals(setup.signer2));
  });

  it("Create UserRole 2 successfully with authorized UserRole", async () => {
    const name = "Role2";
    const allowedAdminIxs = AdminFlags.NONE;
    const allowedMediciIxs = MediciFlags.NONE;

    const ix = await rwaRbacClient.createUserRoleIxn({
      payer: setup.payer,
      user: setup.signer2, // Non-Admin Key
      assetAccessController: setup.assetAccessController,
      name,
      allowedAdminIxs,
      allowedMediciIxs,
      authorizedUserRole: setup.userRole1,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer2Kp,
    ]);

    const userRoleAccount =
      await rwaRbacClient.rbacProgram.account.userRole.fetch(setup.userRole2);
    assert(
      userRoleAccount.assetAccessController.equals(setup.assetAccessController)
    );
    assert(userRoleAccount.id.eq(setup.roleId2));
    assert.equal(userRoleAccount.name, name);
    assert(userRoleAccount.allowedAdminIxs.eqn(allowedAdminIxs));
    assert(userRoleAccount.allowedMediciIxs.eqn(allowedMediciIxs));
    assert.equal(userRoleAccount.users.length, 0);

    const controllerAccount =
      await rwaRbacClient.rbacProgram.account.assetAccessController.fetch(
        setup.assetAccessController
      );
    assert(controllerAccount.userRolesCount.eqn(2));
  });

  it("Modify User Role 1 successfully", async () => {
    const name = "Role2";
    const allowedAdminIxs = computeFlags(
      AdminFlags.MODIFY_USER_ROLE,
      AdminFlags.CREATE_OR_DELETE_USER_ROLE
    );
    const allowedMediciIxs = computeFlags(MediciFlags.ATTACH_TO_POLICY_ACCOUNT);

    const ix = await rwaRbacClient.modifyUserRoleIxn({
      name,
      allowedAdminIxs,
      allowedMediciIxs,
      user: setup.signer1, // Admin Key
      assetAccessController: setup.assetAccessController,
      userRole: setup.userRole1,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    const userRoleAccount =
      await rwaRbacClient.rbacProgram.account.userRole.fetch(setup.userRole1);
    assert(
      userRoleAccount.assetAccessController.equals(setup.assetAccessController)
    );
    assert(userRoleAccount.id.eq(setup.roleId1));
    assert.equal(userRoleAccount.name, name);
    assert(userRoleAccount.allowedAdminIxs.eqn(allowedAdminIxs));
    assert(userRoleAccount.allowedMediciIxs.eqn(allowedMediciIxs));
    assert.equal(userRoleAccount.users.length, 1);
  });

  it("Delete User Role 1 successfully", async () => {
    const preBalance = await connection.getBalance(setup.payer);
    const ix = await rwaRbacClient.deleteUserRoleIxn({
      receiver: setup.payer,
      user: setup.signer1, // Admin Key
      assetAccessController: setup.assetAccessController,
      userRole: setup.userRole1,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    const userRoleAccount =
      await rwaRbacClient.provider.connection.getAccountInfo(setup.userRole1);
    assert.isNull(userRoleAccount);

    // Check that rent is refunded to receiver.
    const postBalance = await connection.getBalance(setup.payer);
    assert(postBalance - preBalance > 0);
  });

  it("Update Controller Admin successfully", async () => {
    const ix = await rwaRbacClient.updateControllerAdminIxn({
      admin: setup.signer1, // Admin Key
      assetAccessController: setup.assetAccessController,
      newAdmin: setup.signer2,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.signer1Kp,
    ]);

    const controllerAccount =
      await rwaRbacClient.rbacProgram.account.assetAccessController.fetch(
        setup.assetAccessController,
        "processed"
      );
    assert(
      controllerAccount.controllerAuthority.equals(setup.controllerAuthority)
    );
    assert.equal(
      controllerAccount.controllerAuthorityBump,
      setup.controllerAuthorityBump
    );
    assert(controllerAccount.admin.equals(setup.signer2));
    assert(controllerAccount.uniqueSeed.eq(new anchor.BN(setup.uniqueSeed)));
    assert(controllerAccount.userRolesCount.eqn(2));
  });
});
