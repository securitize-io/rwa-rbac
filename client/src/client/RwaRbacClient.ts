import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";

import { RwaRbac } from "../types/generated/rwa_rbac";
import * as IDL from "../types/generated/rwa_rbac.json";
import { AssetController } from "./AssetController";
import { PolicyEngine } from "./PolicyEngine";
import { IdentityRegistry } from "./IdentityRegistry";
import { deriveAssetAccessControllerPda, deriveUserRolePda } from "../pdas";
import {
  AssignUserRoleArgs,
  CreateControllerArgs,
  DeleteUserRoleArgs,
  ModifyUserRoleArgs,
  RemoveUserRoleArgs,
  SetupUserRoleArgs,
  UpdateControllerAdminArgs,
  WithdrawExcessRentArgs,
} from "../types/instructions";
import { RwaClient } from "../../../deps/rwa-token/clients/rwa-token-sdk/src";
import { Config } from "../../../deps/rwa-token/clients/rwa-token-sdk/src/classes/types";

export class RwaRbacClient {
  rbacProgram: Program<RwaRbac>;
  rwaClient: RwaClient;
  assetController: AssetController;
  policyEngine: PolicyEngine;
  identityRegistry: IdentityRegistry;
  provider: AnchorProvider;

  constructor(config: Config, wallet: Wallet) {
    this.rwaClient = new RwaClient(config, wallet);
    this.provider = this.rwaClient.provider;
    this.rbacProgram = new Program(IDL as RwaRbac, this.provider);
    this.assetController = new AssetController(
      this.rwaClient,
      this.rbacProgram
    );
    this.policyEngine = new PolicyEngine(this.rwaClient, this.rbacProgram);
    this.identityRegistry = new IdentityRegistry(
      this.rwaClient,
      this.rbacProgram
    );
  }

  /**
   * Asynchronously generates instruction to create AssetAccessController for an organization.
   * @param args - {@link CreateControllerArgs}
   * @returns A Promise that resolves to the instruction to create AssetAccessController.
   */
  async createAssetAccessControllerIxn(args: CreateControllerArgs) {
    return this.rbacProgram.methods
      .createController(new BN(args.uniqueSeed))
      .accountsStrict({
        payer: args.payer,
        admin: args.admin,
        assetAccessController: deriveAssetAccessControllerPda(
          new BN(args.uniqueSeed)
        ),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to update admin key on AssetAccessController.
   * @param args - {@link UpdateControllerAdminArgs}
   * @returns A Promise that resolves to the instruction to update admin on AssetAccessController.
   */
  async updateControllerAdminIxn(args: UpdateControllerAdminArgs) {
    return this.rbacProgram.methods
      .updateControllerAdmin(args.newAdmin)
      .accountsStrict({
        admin: args.admin,
        assetAccessController: args.assetAccessController,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to create a UserRole for an AssetAccessController.
   * @param args - {@link SetupUserRoleArgs}
   * @returns A Promise that resolves to the instruction to create UserRole.
   */
  async createUserRoleIxn(args: SetupUserRoleArgs) {
    // Fetch controller to get next UserRole id.
    const controller =
      await this.rbacProgram.account.assetAccessController.fetch(
        args.assetAccessController
      );

    return this.rbacProgram.methods
      .createUserRole(
        args.name,
        new BN(args.allowedAdminIxs),
        new BN(args.allowedMediciIxs)
      )
      .accountsStrict({
        payer: args.payer,
        user: args.user,
        newUserRole: deriveUserRolePda(
          controller.userRolesCount.addn(1),
          args.assetAccessController
        ),
        authorizedUserRole: args.authorizedUserRole || null,
        assetAccessController: args.assetAccessController,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to modify UserRole.
   * @param args - {@link ModifyUserRoleArgs}
   * @returns A Promise that resolves to the instruction to modify UserRole.
   */
  async modifyUserRoleIxn(args: ModifyUserRoleArgs) {
    return this.rbacProgram.methods
      .modifyUserRole(
        args.name,
        new BN(args.allowedAdminIxs),
        new BN(args.allowedMediciIxs)
      )
      .accountsStrict({
        user: args.user,
        userRole: args.userRole,
        assetAccessController: args.assetAccessController,
        authorizedUserRole: args.authorizedUserRole || null,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to delete UserRole.
   * @param args - {@link DeleteUserRoleArgs}
   * @returns A Promise that resolves to the instruction to delete UserRole.
   */
  async deleteUserRoleIxn(args: DeleteUserRoleArgs) {
    return this.rbacProgram.methods
      .deleteUserRole()
      .accountsStrict({
        receiver: args.receiver,
        user: args.user,
        userRole: args.userRole,
        assetAccessController: args.assetAccessController,
        authorizedUserRole: args.authorizedUserRole || null,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to assign users to a UserRole.
   * @param args - {@link AssignUserRoleArgs}
   * @returns A Promise that resolves to the instruction to assign UserRole.
   */
  async assignUserRoleIxn(args: AssignUserRoleArgs) {
    return this.rbacProgram.methods
      .assignUserRole(args.usersToAssign)
      .accountsStrict({
        payer: args.payer,
        user: args.user,
        userRole: args.userRole,
        authorizedUserRole: args.authorizedUserRole || null,
        assetAccessController: args.assetAccessController,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to remove users from a UserRole.
   * @param args - {@link RemoveUserRoleArgs}
   * @returns A Promise that resolves to the instruction to remove users from a UserRole.
   */
  async removeUserRoleIxn(args: RemoveUserRoleArgs) {
    return this.rbacProgram.methods
      .removeUserRole(args.usersToRemove)
      .accountsStrict({
        user: args.user,
        userRole: args.userRole,
        authorizedUserRole: args.authorizedUserRole || null,
        assetAccessController: args.assetAccessController,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to withdraw excess rent from ControllerAuthority.
   * @param args - {@link WithdrawExcessRentArgs}
   * @returns A Promise that resolves to the instruction to withdraw excess rent from ControllerAuthority.
   */
  async withdrawExcessRentIxn(args: WithdrawExcessRentArgs) {
    return this.rbacProgram.methods
      .withdrawExcessRent()
      .accountsStrict({
        receiver: args.receiver,
        admin: args.admin,
        controllerAuthority: args.controllerAuthority,
        assetAccessController: args.assetAccessController,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }
}
