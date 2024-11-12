import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Config } from "@bridgesplit/rwa-token-sdk/dist/classes/types";
import { RwaClient } from "@bridgesplit/rwa-token-sdk";
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
  SetupUserRoleArgs,
} from "../types/instructions";

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
}
