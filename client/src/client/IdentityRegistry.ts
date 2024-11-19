import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  EditIdentityMetadataArgs,
  RefreshLevelArgs,
  RevokeIdentityArgs,
} from "../types/instructions";
import { deriveControllerAuthorityPda } from "../pdas";
import {
  AddLevelToIdentityAccountArgs,
  getAddLevelToIdentityAccount,
  getIdentityAccountPda,
  getIdentityMetadataPda,
  getIdentityRegistryPda,
  getIdentityRegistryProgram,
  getRemoveLevelFromIdentityAccount,
  identityRegistryProgramId,
  IxReturn,
  RemoveLevelFromIdentityAccountArgs,
  RwaClient,
  SetupUserArgs,
} from "../../../deps/rwa-token/clients/rwa-token-sdk/src";

/**
 * Represents the role-based access client for Identity Registry for an RWA.
 */
export class IdentityRegistry {
  rwaClient: RwaClient;
  rbacProgram: Program<RwaRbac>;

  constructor(rwaClient: RwaClient, rbacProgram: Program<RwaRbac>) {
    this.rwaClient = rwaClient;
    this.rbacProgram = rbacProgram;
  }

  /**
   * Asynchronously generates instructions to setup a user.
   * @param args - {@link SetupUserArgs}
   * @param authority - RBAC AssetAccessController ControllerAuthority.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to setup a user.
   *
   * It is required for at least a single user to be setup before issuing tokens.
   */
  async setupUserIxns(
    args: SetupUserArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<IxReturn> {
    const { ixs } = await this.rwaClient.identityRegistry.setupUserIxns(args);
    const returnIxs = [];

    const identityAccountIx = ixs[0];
    const addLevelIxs = ixs.slice(1, -1);
    const trackerAccountIx = ixs[ixs.length - 1];
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    returnIxs.push(
      await this.rbacProgram.methods
        .createIdentityAccount(identityAccountIx.data)
        .accountsStrict({
          payer: args.payer,
          user: args.signer,
          controllerAuthority,
          assetAccessController,
          authorizedUserRole: authorizedUserRole || null,
          identityRegistryProgram: identityRegistryProgramId,
          identityRegistry: getIdentityRegistryPda(args.assetMint),
          identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
          identityMetadataAccount: getIdentityMetadataPda(
            args.assetMint,
            args.levels[0]
          ),
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    if (args.levels.length > 1) {
      for (let i = 1; i < args.levels.length; i++) {
        returnIxs.push(
          await this.rbacProgram.methods
            .addLevelToIdentityAccount(addLevelIxs[i - 1].data)
            .accountsStrict({
              payer: args.payer,
              user: args.signer,
              controllerAuthority,
              assetAccessController,
              authorizedUserRole: authorizedUserRole || null,
              identityRegistryProgram: identityRegistryProgramId,
              identityRegistry: getIdentityRegistryPda(args.assetMint),
              identityAccount: getIdentityAccountPda(
                args.assetMint,
                args.owner
              ),
              identityMetadataAccount: getIdentityMetadataPda(
                args.assetMint,
                args.levels[i]
              ),
              systemProgram: SystemProgram.programId,
            })
            .instruction()
        );
      }
    }

    return {
      ixs: [...returnIxs, trackerAccountIx],
      signers: [],
    };
  }

  /**
   * Asynchronously update user account identity
   * @param args - {@link AddLevelToIdentityAccountArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to update user account identity.
   * */
  async addIdentityLevelToUserAccount(
    args: AddLevelToIdentityAccountArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const addLevelIx = await getAddLevelToIdentityAccount(
      args,
      this.rwaClient.provider
    );
    const ixData = addLevelIx.data;
    return this.rbacProgram.methods
      .addLevelToIdentityAccount(ixData)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry: getIdentityRegistryPda(args.assetMint),
        identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
        identityMetadataAccount: getIdentityMetadataPda(
          args.assetMint,
          args.level
        ),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Asynchronously reduces a user identity account level
   * @param args - {@link RemoveLevelFromIdentityAccount}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to reduce the level of a user identity account.
   */
  async removeIdentityLevelFromUserAccount(
    args: RemoveLevelFromIdentityAccountArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const removeLevelIx = await getRemoveLevelFromIdentityAccount(
      args,
      this.rwaClient.provider
    );
    const ixData = removeLevelIx.data;
    return this.rbacProgram.methods
      .removeLevelFromIdentityAccount(ixData)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry: getIdentityRegistryPda(args.assetMint),
        identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
        identityMetadataAccount: getIdentityMetadataPda(
          args.assetMint,
          args.level
        ),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to revoke an identity account.
   * @param args - {@link RevokeIdentityArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to revoke an identity account.
   * */
  async revokeIdentityIxn(
    args: RevokeIdentityArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const identityProgram = getIdentityRegistryProgram(this.rwaClient.provider);
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);
    const revokeIx = await identityProgram.methods
      .revokeIdentityAccount(new PublicKey(args.owner))
      .accountsStrict({
        payer: args.payer,
        signer: args.authority,
        identityRegistry,
        identityAccount,
      })
      .instruction();
    const ixData = revokeIx.data;
    return this.rbacProgram.methods
      .revokeIdentityAccount(ixData)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to refresh expiry on an Identity Account level.
   * @param args - {@link RefreshLevelArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to refresh expiry on an Identity Account level.
   * */
  async refreshLevelToIdentityAccountIxn(
    args: RefreshLevelArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const identityProgram = getIdentityRegistryProgram(this.rwaClient.provider);
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);
    const refreshIx = await identityProgram.methods
      .refreshLevelToIdentityAccount(args.level, args.expiry)
      .accountsStrict({
        payer: args.payer,
        signer: args.authority,
        identityRegistry,
        identityAccount,
      })
      .instruction();
    return this.rbacProgram.methods
      .refreshLevelToIdentityAccount(refreshIx.data)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to edit Identity Metadata.
   * @param args - {@link EditIdentityMetadataArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to edit Identity Metadata.
   * */
  async editIdentityMetadataIxn(
    args: EditIdentityMetadataArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const identityProgram = getIdentityRegistryProgram(this.rwaClient.provider);
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const identityMetadataAccount = getIdentityMetadataPda(
      args.assetMint,
      args.level
    );
    const editIx = await identityProgram.methods
      .editIdentityMetdata(
        args.level,
        args.maxAllowed || null,
        args.minAllowed || null
      )
      .accountsStrict({
        payer: args.payer,
        signer: args.authority,
        identityRegistry,
        identityMetadataAccount,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    return this.rbacProgram.methods
      .editIdentityMetadata(editIx.data)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityMetadataAccount,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }
}
