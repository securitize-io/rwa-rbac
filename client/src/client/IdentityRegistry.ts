import { Program } from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  AttachDetachWalletArgs,
  RevokeIdentityArgs,
} from "../types/instructions";
import {
  getIdentityAccount,
  getIdentityAccountPda,
  getIdentityRegistryEventAuthority,
  getIdentityRegistryPda,
  getIdentityRegistryProgram,
  getTrackerAccountPda,
  getWalletIdentityAccountPda,
  identityRegistryProgramId,
  IxReturn,
  policyEngineProgramId,
  RwaClient,
  SetupUserArgs,
} from "@dstoken-solana/rwa-token-sdk";
import { deriveControllerAuthorityPda } from "../pdas";
import { SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

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
   * Asynchronously generates instructions to setup a non-investor user with an identity account.
   * @param args - {@link SetupUserArgs}
   * @param authority - RBAC AssetAccessController ControllerAuthority.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
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
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);
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
          identityAccount,
          walletIdentity: getWalletIdentityAccountPda(
            args.assetMint,
            args.owner
          ),
          systemProgram: SystemProgram.programId,
          eventAuthority: getIdentityRegistryEventAuthority(),
          policyEngineProgram: policyEngineProgramId,
          trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
          assetMint: args.assetMint,
        })
        .instruction()
    );

    return {
      ixs: returnIxs,
      signers: [],
    };
  }

  /**
   * Asynchronously generates instructions to remove a non-investor user with an identity account.
   * @param args - {@link SetupUserArgs}
   * @param authority - RBAC AssetAccessController ControllerAuthority.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
   * @returns A Promise that resolves to the instructions to setup a user.
   *
   * It is required for at least a single user to be setup before issuing tokens.
   */
  async removeUserIxn(
    args: RevokeIdentityArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const ix = await this.rwaClient.identityRegistry.revokeIdentityAccount(
      args
    );
    const identityAccountAddress = getIdentityAccountPda(
      args.assetMint,
      args.owner
    );
    const identityAccount = await getIdentityAccount(
      identityAccountAddress,
      this.rwaClient.provider
    );

    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const returnIx = await this.rbacProgram.methods
        .removeIdentityAccount(ix.data)
        .accountsStrict({
          payer: args.payer,
          user: args.signer,
          controllerAuthority,
          assetAccessController,
          authorizedUserRole: authorizedUserRole || null,
          identityRegistryProgram: identityRegistryProgramId,
          identityRegistry: getIdentityRegistryPda(args.assetMint),
          identityAccount: identityAccountAddress,
          walletIdentity: getWalletIdentityAccountPda(
            args.assetMint,
            args.owner
          ),
          eventAuthority: getIdentityRegistryEventAuthority(),
          identityOwner: identityAccount.owner,
          policyEngineProgram: policyEngineProgramId,
          trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
          assetMint: args.assetMint,
        })
        .instruction();

    return returnIx;
  }

  /**
   * Asynchronously generates instruction to attach wallet to identity.
   * @param args - {@link AttachDetachWalletArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
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
    const newWalletIdentityAccount = getIdentityAccountPda(
      args.assetMint,
      args.wallet
    );
    const walletIdentity = getWalletIdentityAccountPda(
      args.assetMint,
      args.wallet.toString()
    );

    const ix = await identityProgram.methods
      .attachWalletToIdentity(new PublicKey(args.wallet))
      .accountsStrict({
        payer: args.payer,
        authority: controllerAuthority,
        identityAccount,
        identityRegistry,
        assetMint: args.assetMint,
        walletIdentity,
        systemProgram: SystemProgram.programId,
        eventAuthority: getIdentityRegistryEventAuthority(),
        program: identityRegistryProgramId,
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
        eventAuthority: getIdentityRegistryEventAuthority(),
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to detach wallet from identity.
   * @param args - {@link AttachDetachWalletArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
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

    const tokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      new PublicKey(args.wallet),
      true,
      TOKEN_2022_PROGRAM_ID
    );

    const ix = await identityProgram.methods
      .detachWalletFromIdentity()
      .accountsStrict({
        payer: args.payer,
        authority: controllerAuthority,
        walletIdentity,
        identityAccount,
        identityRegistry,
        eventAuthority: getIdentityRegistryEventAuthority(),
        program: identityRegistryProgramId,
        tokenAccount: tokenAccount,
        assetMint: args.assetMint,
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
        eventAuthority: getIdentityRegistryEventAuthority(),
        tokenAccount: tokenAccount,
        assetMint: args.assetMint,
      })
      .instruction();
  }
}
