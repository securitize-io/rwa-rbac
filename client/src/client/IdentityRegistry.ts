import { Program } from "@coral-xyz/anchor";
import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  AddLevelToIdentityAccountArgs,
  getAddLevelToIdentityAccount,
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getIdentityRegistryProgram,
  getRemoveLevelFromIdentityAccount,
  identityRegistryProgramId,
  IxReturn,
  RemoveLevelFromIdentityAccountArgs,
  RwaClient,
  SetupUserArgs,
} from "@bridgesplit/rwa-token-sdk";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { RevokeIdentityArgs } from "../types/instructions";

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
    authority: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<IxReturn> {
    const { ixs } = await this.rwaClient.identityRegistry.setupUserIxns(args);
    const [identityAccountIx, trackerAccountIx] = ixs;
    const ixData = identityAccountIx.data;
    const wrappedIx = await this.rbacProgram.methods
      .createIdentityAccount(ixData)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority: authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry: getIdentityRegistryPda(args.assetMint),
        identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return {
      ixs: [wrappedIx, trackerAccountIx],
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
}
