import { Program } from "@coral-xyz/anchor";
import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  assetControllerProgramId,
  CloseMintArgs,
  FreezeTokenArgs,
  getAssetControllerEventAuthority,
  getAssetControllerPda,
  getCloseMintIx,
  getExtraMetasListPda,
  getFreezeTokenIx,
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getIssueTokensIx,
  getPolicyAccountPda,
  getPolicyEnginePda,
  getRevokeTokensIx,
  getThawTokenIx,
  getTrackerAccountPda,
  getUpdateInterestBearingMintRateIx,
  identityRegistryProgramId,
  IssueTokenArgs,
  policyEngineProgramId,
  RevokeTokensArgs,
  RwaClient,
  SetupAssetControllerArgs,
  TransferTokensArgs,
  UpdateAssetMetadataArgs,
  VoidTokensArgs,
} from "@bridgesplit/rwa-token-sdk";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { UpdateInterestBearingMintRateArgs } from "../types/instructions";

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
   * @param args - {@link SetupAssetControllerArgs}
   * @returns A Promise that resolves to the instructions to create an asset controller.
   */
  async setupNewRegistry(args: SetupAssetControllerArgs) {
    return this.rwaClient.assetController.setupNewRegistry(args);
  }

  /**
   * Update the asset controller's metadata.
   * @param args - {@link UpdateAssetMetadataArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to update the asset controller's metadata.
   * */
  async updateAssetMetadata(
    args: UpdateAssetMetadataArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
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
   * Asynchronously generates instructions to issue tokens.
   * @param args - {@link IssueTokenArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to issue tokens.
   */
  async issueTokenIxns(
    args: IssueTokenArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction[]> {
    const issueTokensIxs = await getIssueTokensIx(
      args,
      this.rwaClient.provider
    );
    const ixData = issueTokensIxs[0].data;
    const tokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      new PublicKey(args.owner),
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const ixs = [];

    // Check if token account exists.
    const tokenAccountData =
      await this.rbacProgram.provider.connection.getAccountInfo(tokenAccount);
    if (!tokenAccountData) {
      // ATA needs to be created separately as controller_pda cannot be payer.
      const createAtaIx = createAssociatedTokenAccountInstruction(
        new PublicKey(args.payer),
        tokenAccount,
        new PublicKey(args.owner),
        new PublicKey(args.assetMint),
        TOKEN_2022_PROGRAM_ID
      );
      ixs.push(createAtaIx);
    }

    ixs.push(
      await this.rbacProgram.methods
        .issueTokens(ixData)
        .accountsStrict({
          user: args.signer,
          controllerAuthority: args.authority,
          assetAccessController: assetAccessController,
          authorizedUserRole: authorizedUserRole || null,
          assetControllerProgram: assetControllerProgramId,
          assetMint: args.assetMint,
          assetController: getAssetControllerPda(args.assetMint),
          to: args.owner,
          tokenAccount,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );
    return ixs;
  }

  /**
   * Asynchronously generates instructions to revoke assets.
   * @param args - {@link VoidTokensArgs}
   * @returns A Promise that resolves to the instructions to revoke assets.
   */
  async voidTokenIxns(args: VoidTokensArgs): Promise<TransactionInstruction> {
    return this.rwaClient.assetController.voidTokenIxns(args);
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
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instruction to freeze.
   */
  async freezeTokenIxn(
    args: FreezeTokenArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const freezeIx = await getFreezeTokenIx(args, this.rwaClient.provider);
    const ixData = freezeIx.data;
    const tokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      new PublicKey(args.owner),
      false,
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
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instruction to thaw.
   */
  async thawTokenIxn(
    args: FreezeTokenArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const thawIx = await getThawTokenIx(args, this.rwaClient.provider);
    const ixData = thawIx.data;
    const tokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      new PublicKey(args.owner),
      false,
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
   * @param payer - Payer public key.
   * @param signer - User signer public key.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to revoke.
   */
  async revokeTokenIxn(
    args: RevokeTokensArgs,
    payer: PublicKey,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction[]> {
    const revokeIx = await getRevokeTokensIx(args, this.rwaClient.provider);
    const ixData = revokeIx[0].data;
    const assetController = getAssetControllerPda(args.assetMint);
    const remainingAccounts = [
      {
        pubkey: getPolicyEnginePda(args.assetMint),
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: identityRegistryProgramId,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: getIdentityRegistryPda(args.assetMint),
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: getIdentityAccountPda(
          args.assetMint,
          assetController.toString()
        ),
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: getTrackerAccountPda(
          args.assetMint,
          assetController.toString()
        ),
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: getPolicyAccountPda(args.assetMint),
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: policyEngineProgramId,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: getExtraMetasListPda(args.assetMint),
        isWritable: false,
        isSigner: false,
      },
    ];
    const authorityAta = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      assetController,
      true,
      TOKEN_2022_PROGRAM_ID
    );
    const revokeTokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      new PublicKey(args.owner),
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Check if token account exists.
    const tokenAccountData =
      await this.rbacProgram.provider.connection.getAccountInfo(authorityAta);

    const ixs = [];
    if (!tokenAccountData) {
      // ATA needs to be created separately as controller_pda cannot be payer.
      const createAtaIx = createAssociatedTokenAccountInstruction(
        payer,
        authorityAta,
        assetController,
        new PublicKey(args.assetMint),
        TOKEN_2022_PROGRAM_ID
      );
      ixs.push(createAtaIx);
    }

    ixs.push(
      await this.rbacProgram.methods
        .revokeTokens(ixData)
        .accountsStrict({
          user: signer,
          controllerAuthority: args.authority,
          assetAccessController: assetAccessController,
          authorizedUserRole: authorizedUserRole || null,
          assetControllerProgram: assetControllerProgramId,
          assetMint: args.assetMint,
          assetController,
          authorityTokenAccount: authorityAta,
          revokeTokenAccount,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .instruction()
    );
    return ixs;
  }

  /**
   * Asynchronously generates instruction to close mint.
   * @param args - {@link CloseMintArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instruction to close mint.
   */
  async closeMintIxn(
    args: CloseMintArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const closeIx = await getCloseMintIx(args, this.rwaClient.provider);
    const ixData = closeIx.data;
    return this.rbacProgram.methods
      .closeMintAccount(ixData)
      .accountsStrict({
        user: args.signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        assetControllerProgram: assetControllerProgramId,
        assetMint: args.assetMint,
        assetController: getAssetControllerPda(args.assetMint),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();
  }

  /**
   * Asynchronously generates instruction to update mint interest rate.
   * @param args - {@link UpdateInterestBearingMintRateArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instruction to update mint interest rate.
   */
  async updateInterestBearingMintRateIxn(
    args: UpdateInterestBearingMintRateArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const updateIx = await getUpdateInterestBearingMintRateIx(
      args,
      this.rwaClient.provider
    );
    const ixData = updateIx.data;
    return this.rbacProgram.methods
      .updateInterestBearingMintRate(ixData)
      .accountsStrict({
        user: args.signer,
        controllerAuthority: args.authority,
        assetAccessController: assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        assetControllerProgram: assetControllerProgramId,
        assetMint: args.assetMint,
        assetController: getAssetControllerPda(args.assetMint),
        eventAuthority: getAssetControllerEventAuthority(),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();
  }
}
