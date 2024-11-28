import { Program } from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  AttachDetachWalletArgs,
  RefreshLevelArgs,
} from "../types/instructions";
import {
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getIdentityRegistryProgram,
  getWalletIdentityAccountPda,
  identityRegistryProgramId,
  RwaClient,
} from "../../../deps/rwa-token/clients/rwa-token-sdk/src";
import { deriveControllerAuthorityPda } from "../pdas";
import { SystemProgram } from "@solana/web3.js";

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
   * Asynchronously generates instruction to attach wallet to identity.
   * @param args - {@link AttachDetachWalletArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to attach wallet.
   * */
  async attachWalletToIdentityIxn(
    args: AttachDetachWalletArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const identityProgram = getIdentityRegistryProgram(this.rwaClient.provider);
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);
    const walletIdentity = getWalletIdentityAccountPda(
      args.assetMint,
      args.wallet.toString()
    );

    const ix = await identityProgram.methods
      .attachWalletToIdentity(args.wallet)
      .accountsStrict({
        payer: args.payer,
        authority: controllerAuthority,
        identityAccount,
        identityRegistry,
        assetMint: args.assetMint,
        walletIdentity,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    return this.rbacProgram.methods
      .attachWalletToIdentity(ix.data)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityRegistryProgram: identityRegistryProgramId,
        identityAccount,
        identityRegistry,
        assetMint: args.assetMint,
        walletIdentity,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to detach wallet from identity.
   * @param args - {@link AttachDetachWalletArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to detach wallet.
   * */
  async detachWalletFromIdentityIxn(
    args: AttachDetachWalletArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const identityProgram = getIdentityRegistryProgram(this.rwaClient.provider);
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);
    const walletIdentity = getWalletIdentityAccountPda(
      args.assetMint,
      args.wallet.toString()
    );

    const ix = await identityProgram.methods
      .detachWalletFromIdentity()
      .accountsStrict({
        payer: args.payer,
        authority: controllerAuthority,
        walletIdentity,
        identityAccount,
        identityRegistry,
      })
      .instruction();
    return this.rbacProgram.methods
      .detachWalletFromIdentity(ix.data)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityRegistryProgram: identityRegistryProgramId,
        walletIdentity,
        identityAccount,
        identityRegistry,
      })
      .instruction();
  }
}
