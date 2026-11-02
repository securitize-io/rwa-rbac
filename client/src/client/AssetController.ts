import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import {
  IssueTokensArgs,
  IssueTokensWithLockArgs,
  UpdateInterestBearingMintRateArgs,
} from "../types/instructions";
import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  assetControllerProgramId,
  CreateAssetControllerIx,
  FreezeTokenArgs,
  getAssetControllerEventAuthority,
  getAssetControllerPda,
  getCreateAssetControllerIx,
  getExtraMetasListPda,
  getFreezeTokenIx,
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getIssueTokensIx,
  getPolicyEnginePda,
  getRevokeTokensIx,
  getSeizeTokensIx,
  getThawTokenIx,
  getTrackerAccountPda,
  getWalletIdentityAccountPda,
  identityRegistryProgramId,
  policyEngineProgramId,
  RevokeTokensArgs,
  RwaClient,
  SeizeTokensArgs,
  TransferTokensArgs,
  UpdateAssetMetadataArgs,
} from "@dstoken-solana/rwa-token-sdk";
import {
  deriveControllerAuthorityPda,
  deriveInvestorPda,
} from "../pdas";

/**
 * Represents the role-based access client for Asset Controller for an RWA.
 */
export class AssetController {
  rwaClient: RwaClient;
  rbacProgram: Program<RwaRbac>;

  constructor(rwaClient: RwaClient, rbacProgram: Program<RwaRbac>) {
    this.rwaClient = rwaClient;
    this.rbacProgram = rbacProgram;
  }

  /**
   * Asynchronously generates instructions to setup a new asset controller.
   * @param args - {@link CreateAssetControllerIx}
   * @returns A Promise that resolves to the instructions to create an asset controller.
   */
  async setupNewRegistry(args: CreateAssetControllerIx): Promise<TransactionInstruction> {
    return getCreateAssetControllerIx(args, this.rwaClient.provider);
  }

  /**
   * Update the asset controller's metadata.
   * @param args - {@link UpdateAssetMetadataArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
   * @returns A Promise that resolves to the instructions to update the asset controller's metadata.
   * */
  async updateAssetMetadata(
    args: UpdateAssetMetadataArgs,
    assetAccessController: PublicKey,
    authorizedUserRole: PublicKey
  ): Promise<TransactionInstruction> {
    const updateIx = await this.rwaClient.assetController.updateAssetMetadata(
      args
    );
    const ixData = updateIx.data;
    return this.rbacProgram.methods
      .updateAssetMetadata(ixData)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        assetMint: args.assetMint,
        assetController: getAssetControllerPda(args.assetMint),
        assetControllerProgram: assetControllerProgramId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        eventAuthority: getAssetControllerEventAuthority(),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instructions to issue tokens and lock tokens according to issuance policy.
   * The Policy Engine automatically prunes matured issuance history and reuses
   * tracker allocation before growing it. Already matured issuances add no history.
   * @param args - {@link IssueTokensWithLockArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
   */
  async issueTokenIxns(
    args: IssueTokensArgs,
    assetAccessController: PublicKey,
    authorizedUserRole: PublicKey
  ): Promise<TransactionInstruction> {
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const investorPda = deriveInvestorPda(args.investorId, identityRegistry);

    const issueTokensIxs = await getIssueTokensIx(
      {
        payer: args.payer,
        signer: args.signer,
        wallet: args.wallet,
        assetMint: args.assetMint,
        amount: args.amount,
        timestamp: args.issuanceTimestamp,
        authority: controllerAuthority.toString(),
        owner: investorPda.toString(),
      },
      this.rwaClient.provider
    );
    const trackerAccount = getTrackerAccountPda(
      args.assetMint,
      investorPda.toString()
    );

    const ixData = issueTokensIxs[0].data;
    const tokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      new PublicKey(args.wallet),
      true,
      TOKEN_2022_PROGRAM_ID
    );

    return await this.rbacProgram.methods
      .issueTokens(ixData)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority: controllerAuthority,
        assetAccessController: assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        assetControllerProgram: assetControllerProgramId,
        assetMint: args.assetMint,
        assetController: getAssetControllerPda(args.assetMint),
        to: args.wallet,
        tokenAccount: tokenAccount,
        policyEngine: getPolicyEnginePda(args.assetMint),
        policyEngineProgram: policyEngineProgramId,
        identityAccount: getIdentityAccountPda(
          args.assetMint,
          investorPda.toString()
        ),
        trackerAccount,
        identityRegistry,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        walletIdentityAccount: getWalletIdentityAccountPda(
          args.assetMint,
          args.wallet
        ),
        eventAuthority: getAssetControllerEventAuthority(),
      })
      .instruction();
  }

  /**
   * Executes a token transfer.
   * @param args - {@link TransferTokensArgs}
   * @returns A promise that resolves to transaction instruction.
   */
  async transfer(args: TransferTokensArgs): Promise<TransactionInstruction[]> {
    return this.rwaClient.assetController.transfer(args);
  }

  /**
   * Asynchronously generates instruction to freeze a token account.
   * @param args - {@link FreezeTokenArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
   * @returns A Promise that resolves to the instruction to freeze.
   */
  async freezeTokenIxn(
    args: FreezeTokenArgs,
    assetAccessController: PublicKey,
    authorizedUserRole: PublicKey
  ): Promise<TransactionInstruction> {
    const freezeIx = await getFreezeTokenIx(args, this.rwaClient.provider);
    const ixData = freezeIx.data;
    const tokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      new PublicKey(args.owner),
      true,
      TOKEN_2022_PROGRAM_ID
    );
    return this.rbacProgram.methods
      .freezeTokenAccount(ixData)
      .accountsStrict({
        user: args.signer,
        controllerAuthority: args.authority,
        assetAccessController: assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        assetControllerProgram: assetControllerProgramId,
        assetMint: args.assetMint,
        assetController: getAssetControllerPda(args.assetMint),
        tokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to thaw a token account.
   * @param args - {@link FreezeTokenArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
   * @returns A Promise that resolves to the instruction to thaw.
   */
  async thawTokenIxn(
    args: FreezeTokenArgs,
    assetAccessController: PublicKey,
    authorizedUserRole: PublicKey
  ): Promise<TransactionInstruction> {
    const thawIx = await getThawTokenIx(args, this.rwaClient.provider);
    const ixData = thawIx.data;
    const tokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      new PublicKey(args.owner),
      true,
      TOKEN_2022_PROGRAM_ID
    );
    return this.rbacProgram.methods
      .thawTokenAccount(ixData)
      .accountsStrict({
        user: args.signer,
        controllerAuthority: args.authority,
        assetAccessController: assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        assetControllerProgram: assetControllerProgramId,
        assetMint: args.assetMint,
        assetController: getAssetControllerPda(args.assetMint),
        tokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instructions to revoke tokens from a user.
   * @param args - {@link RevokeTokensArgs}
   * @param signer - User signer public key.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
   * @param investorId - Optional investorId. Required if user is not an investor.
   * @returns A Promise that resolves to the instructions to revoke.
   */
  async revokeTokenIxn(
    args: RevokeTokensArgs,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole: PublicKey,
    investorId?: string
  ): Promise<TransactionInstruction> {
    if (!args.wallet) {
      throw new Error("Use wallet arg for wallet to revoke tokens from.");
    }
    // Set owner (even though it is InvestorPda) as wallet to generate ix data.
    args.owner = args.wallet;

    const revokeIx = await getRevokeTokensIx(args, this.rwaClient.provider);
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const investorPda = investorId
      ? deriveInvestorPda(investorId, identityRegistry)
      : null;
    const ixData = revokeIx.data;
    const assetController = getAssetControllerPda(args.assetMint);
    const revokeTokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      new PublicKey(args.wallet),
      true,
      TOKEN_2022_PROGRAM_ID
    );

    return await this.rbacProgram.methods
      .revokeTokens(ixData)
      .accountsStrict({
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController: assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        assetControllerProgram: assetControllerProgramId,
        assetMint: args.assetMint,
        assetController,
        revokeTokenAccount,
        identityRegistry,
        identityAccount: getIdentityAccountPda(
          args.assetMint,
          investorId ? investorPda.toString() : args.owner
        ),
        trackerAccount: getTrackerAccountPda(
          args.assetMint,
          investorId ? investorPda.toString() : args.owner
        ),
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        walletIdentityAccount: getWalletIdentityAccountPda(
          args.assetMint,
          args.wallet
        ),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        eventAuthority: getAssetControllerEventAuthority(),
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to seize tokens.
   * @param args - {@link SeizeTokensArgs}
   * @param signer - User signer public key.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
   * @returns A Promise that resolves to the instruction to seize.
   */
  async seizeTokensIxn(
    args: SeizeTokensArgs,
    investorId: string,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole: PublicKey
  ): Promise<TransactionInstruction> {
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const investorPda = deriveInvestorPda(investorId, identityRegistry);
    const [_, seizeIx] = await getSeizeTokensIx(
      { ...args, wallet: args.from, from: investorPda.toString() },
      this.rwaClient.provider
    );
    return this.rbacProgram.methods
      .seizeTokens(seizeIx.data)
      .accountsStrict({
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController: assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        assetControllerProgram: assetControllerProgramId,
        assetMint: args.assetMint,
        assetController: getAssetControllerPda(args.assetMint),
        sourceTokenAccount: getAssociatedTokenAddressSync(
          new PublicKey(args.assetMint),
          new PublicKey(args.from),
          true,
          TOKEN_2022_PROGRAM_ID
        ),
        destinationTokenAccount: getAssociatedTokenAddressSync(
          new PublicKey(args.assetMint),
          new PublicKey(args.to),
          true,
          TOKEN_2022_PROGRAM_ID
        ),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        eventAuthority: getAssetControllerEventAuthority(),
      })
      .remainingAccounts([
        {
          pubkey: getPolicyEnginePda(args.assetMint),
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: identityRegistryProgramId,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: policyEngineProgramId,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: getIdentityRegistryPda(args.assetMint),
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: getIdentityAccountPda(args.assetMint, args.to),
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: getIdentityAccountPda(args.assetMint, investorPda.toString()),
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: getTrackerAccountPda(args.assetMint, args.to),
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: getTrackerAccountPda(args.assetMint, investorPda.toString()),
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: getExtraMetasListPda(args.assetMint),
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: getWalletIdentityAccountPda(args.assetMint, args.to),
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: getWalletIdentityAccountPda(args.assetMint, args.from),
          isWritable: false,
          isSigner: false,
        },
      ])
      .instruction();
  }
}
