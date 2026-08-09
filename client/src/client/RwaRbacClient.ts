import { BN, Program, Provider, utils } from '@anchor-lang/core';
import { CompiledInstruction, SystemProgram, TransactionInstruction } from '@solana/web3.js';

import { RwaRbac } from '../types/generated/rwa_rbac';
import * as rbacIDL from '../types/generated/rwa_rbac.json';
import { RwaImr } from '../types/generated/rwa_imr';
import * as imrIDL from '../types/generated/rwa_imr.json';
import { AssetController } from './AssetController';
import { PolicyEngine } from './PolicyEngine';
import { IdentityRegistry } from './IdentityRegistry';
import {
  deriveAssetAccessControllerPda,
  deriveControllerAuthorityPda,
  deriveUserRolePda,
  getEventAuthority,
} from '../pdas';
import {
  AssignUserRoleArgs,
  CreateControllerArgs,
  DeleteUserRoleArgs,
  ModifyUserRoleArgs,
  RemoveUserRoleArgs,
  SetLookuptableAddressArgs,
  SetupUserRoleArgs,
  UpdateControllerAdminArgs,
  WithdrawExcessRentArgs,
} from '../types/instructions';
import { getAssetControllerEventAuthority, RwaClient } from '@dstoken-solana/rwa-token-sdk';
import { Config } from '@dstoken-solana/rwa-token-sdk';
import { IdentityMetadataRegistry } from './IdentityMetadataRegistry';
import { RBAC_PROGRAM } from '../constants';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

export class RwaRbacClient {
  rbacProgram: Program<RwaRbac>;
  rwaClient: RwaClient;
  assetController: AssetController;
  policyEngine: PolicyEngine;
  identityRegistry: IdentityRegistry;
  identityMetadataRegistry: IdentityMetadataRegistry;
  provider: Provider;

  constructor(config: Config, provider: Provider) {
    this.rwaClient = new RwaClient(config, provider);
    this.provider = provider;
    this.rbacProgram = new Program(rbacIDL as RwaRbac, this.provider);
    this.assetController = new AssetController(this.rwaClient, this.rbacProgram);
    this.policyEngine = new PolicyEngine(this.rwaClient, this.rbacProgram);
    this.identityRegistry = new IdentityRegistry(this.rwaClient, this.rbacProgram);
    this.identityMetadataRegistry = new IdentityMetadataRegistry(
      this.rwaClient,
      this.rbacProgram,
      new Program(imrIDL as RwaImr, this.provider)
    );
  }

  /**
   * Parses inner instructions data field for array of events emitted by program using CPI Events.
   * @param ixs - Array of CompiledInstruction from a transaction inner instructions.
   * @returns Array of Events
   * */
  parseEvents(ixs: CompiledInstruction[]) {
    const eventCoder = this.rbacProgram.coder.events;
    const events = ixs
      .map(({ data }) => {
        try {
          const buffer = Buffer.from(utils.bytes.bs58.decode(data));
          const event = eventCoder.decode(utils.bytes.base64.encode(buffer.slice(8)));
          return event;
        } catch (err) {
          console.error('Error decoding events', err);
        }
      })
      .filter((v) => v != null);
    return events;
  }

  /**
   * Asynchronously generates instruction to create AssetAccessController for an organization.
   * @param args - {@link CreateControllerArgs}
   * @returns A Promise that resolves to the instruction to create AssetAccessController.
   */
  async createAssetAccessControllerIxn(args: CreateControllerArgs): Promise<TransactionInstruction> {
    const assetAccessController = deriveAssetAccessControllerPda(args.assetMint);
    const assetAccessControllerAuthority = deriveControllerAuthorityPda(assetAccessController);

    const cpiInstruction = await this.assetController.setupNewRegistry({
      decimals: args.decimals,
      authority: assetAccessControllerAuthority.toString(),
      name: args.name,
      uri: args.uri,
      symbol: args.symbol,
      assetMint: args.assetMint.toString(),
      payer: args.payer.toString(),
    });

    return this.rbacProgram.methods
      .createController(cpiInstruction.data)
      .accountsStrict({
        payer: args.payer,
        admin: args.admin,
        assetAccessController,
        assetAccessControllerAuthority,
        assetMint: args.assetMint,
        assetController: cpiInstruction.keys[2].pubkey,
        extraMetasAccount: cpiInstruction.keys[4].pubkey,
        policyEngineAccount: cpiInstruction.keys[5].pubkey,
        identityRegistryAccount: cpiInstruction.keys[6].pubkey,
        policyEngineProgram: cpiInstruction.keys[7].pubkey,
        identityRegistryProgram: cpiInstruction.keys[8].pubkey,
        assetControllerProgram: cpiInstruction.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        assetControllerEventAuthority: getAssetControllerEventAuthority(),
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to update admin key on AssetAccessController.
   * @param args - {@link UpdateControllerAdminArgs}
   * @returns A Promise that resolves to the instruction to update admin on AssetAccessController.
   */
  async updateControllerAdminIxn(args: UpdateControllerAdminArgs): Promise<TransactionInstruction> {
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
  async createUserRoleIxn(args: SetupUserRoleArgs): Promise<TransactionInstruction> {
    // Fetch controller to get next UserRole id.
    const controller = await this.rbacProgram.account.assetAccessController.fetch(args.assetAccessController);

    return this.rbacProgram.methods
      .createUserRole(
        args.name,
        new BN(args.allowedAdminIxs),
        new BN(args.allowedMediciIxs),
        args.isMasterRole || false
      )
      .accountsStrict({
        payer: args.payer,
        user: args.user,
        newUserRole: deriveUserRolePda(controller.userRolesCount.addn(1), args.assetAccessController),
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
  async modifyUserRoleIxn(args: ModifyUserRoleArgs): Promise<TransactionInstruction> {
    return this.rbacProgram.methods
      .modifyUserRole(args.name, new BN(args.allowedAdminIxs), new BN(args.allowedMediciIxs))
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
  async deleteUserRoleIxn(args: DeleteUserRoleArgs): Promise<TransactionInstruction> {
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
  async assignUserRoleIxn(args: AssignUserRoleArgs): Promise<TransactionInstruction> {
    return this.rbacProgram.methods
      .assignUserRole(args.usersToAssign)
      .accountsStrict({
        payer: args.payer,
        user: args.user,
        userRole: args.userRole,
        authorizedUserRole: args.authorizedUserRole || null,
        assetAccessController: args.assetAccessController,
        systemProgram: SystemProgram.programId,
        eventAuthority: getEventAuthority(RBAC_PROGRAM),
        program: RBAC_PROGRAM,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to remove users from a UserRole.
   * @param args - {@link RemoveUserRoleArgs}
   * @returns A Promise that resolves to the instruction to remove users from a UserRole.
   */
  async removeUserRoleIxn(args: RemoveUserRoleArgs): Promise<TransactionInstruction> {
    return this.rbacProgram.methods
      .removeUserRole(args.usersToRemove)
      .accountsStrict({
        user: args.user,
        userRole: args.userRole,
        authorizedUserRole: args.authorizedUserRole || null,
        assetAccessController: args.assetAccessController,
        eventAuthority: getEventAuthority(RBAC_PROGRAM),
        program: RBAC_PROGRAM,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to withdraw excess rent from ControllerAuthority.
   * @param args - {@link WithdrawExcessRentArgs}
   * @returns A Promise that resolves to the instruction to withdraw excess rent from ControllerAuthority.
   */
  async withdrawExcessRentIxn(args: WithdrawExcessRentArgs): Promise<TransactionInstruction> {
    return this.rbacProgram.methods
      .withdrawExcessRent()
      .accountsStrict({
        receiver: args.receiver,
        user: args.admin,
        controllerAuthority: args.controllerAuthority,
        assetAccessController: args.assetAccessController,
        systemProgram: SystemProgram.programId,
        authorizedUserRole: args.authorizedUserRole || null,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to set lookup table address field in the AssetAccessController.
   * @param args - {@link SetLookuptableAddressArgs}
   * @returns A Promise that resolves to the instruction to set lookup table address.
   */
  async setLookuptableAddressIxn(args: SetLookuptableAddressArgs): Promise<TransactionInstruction> {
    return this.rbacProgram.methods
      .setLutAddress()
      .accountsStrict({
        user: args.signer,
        assetAccessController: args.assetAccessController,
        authorizedUserRole: args.authorizedUserRole || null,
        lutAddress: args.lutAddress,
      })
      .instruction();
  }
}
