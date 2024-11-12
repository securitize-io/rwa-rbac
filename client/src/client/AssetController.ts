import { Program } from "@coral-xyz/anchor";
import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  assetControllerProgramId,
  getAssetControllerEventAuthority,
  getAssetControllerPda,
  getIssueTokensIx,
  IssueTokenArgs,
  RwaClient,
  SetupAssetControllerArgs,
  TransferTokensArgs,
  UpdateAssetMetadataArgs,
  VoidTokensArgs,
} from "@bridgesplit/rwa-token-sdk";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

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
   * @param - {@link SetupAssetControllerArgs}
   * @returns A Promise that resolves to the instructions to create an asset controller.
   */
  async setupNewRegistry(createAssetControllerArgs: SetupAssetControllerArgs) {
    return this.rwaClient.assetController.setupNewRegistry(
      createAssetControllerArgs
    );
  }

  /**
   * Update the asset controller's metadata.
   * @param - {@link UpdateAssetMetadataArgs}
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
        authorizedUserRole,
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
   * @param - {@link IssueTokenArgs}
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
          authorizedUserRole: authorizedUserRole,
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
   * @param - {@link VoidTokensArgs}
   * @returns A Promise that resolves to the instructions to revoke assets.
   */
  async voidTokenIxns(
    voidTokenArgs: VoidTokensArgs
  ): Promise<TransactionInstruction> {
    return this.rwaClient.assetController.voidTokenIxns(voidTokenArgs);
  }

  /**
   * Executes a token transfer.
   * @returns A promise that resolves to transaction instruction.
   */
  async transfer(
    transferArgs: TransferTokensArgs
  ): Promise<TransactionInstruction[]> {
    return this.rwaClient.assetController.transfer(transferArgs);
  }
}
