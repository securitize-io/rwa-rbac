import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";

import { RwaRbac } from "../types/generated/rwa_rbac";
import { TokenLocks as TokenLocksType } from "../types/generated/token_locks";
import {
  deriveControllerAuthorityPda,
  deriveInvestorLocks,
  deriveInvestorPda,
  deriveLockedTokenAccount,
} from "../pdas";
import {
  assetControllerProgramId,
  getAssetControllerPda,
  getExtraMetasListPda,
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getPolicyEnginePda,
  getTrackerAccountPda,
  getWalletIdentityAccountPda,
  identityRegistryProgramId,
  policyEngineProgramId,
  RwaClient,
} from "../../../deps/rwa-token/clients/rwa-token-sdk/src";
import { TL_PROGRAM } from "../constants";
import {
  AddTokenLockArgs,
  CreateOrCloseInvestorLocksArgs,
  RemoveTokenLockArgs,
} from "../types/instructions";
import { Commitment } from "@solana/web3.js";

/**
 * Role-based access client for accessing Token Locks
 */
export class TokenLocks {
  rwaClient: RwaClient;
  rbacProgram: Program<RwaRbac>;
  tokenLocksProgram: Program<TokenLocksType>;

  constructor(
    rwaClient: RwaClient,
    rbacProgram: Program<RwaRbac>,
    tokenLocksProgram: Program<TokenLocksType>
  ) {
    this.rwaClient = rwaClient;
    this.rbacProgram = rbacProgram;
    this.tokenLocksProgram = tokenLocksProgram;
  }

  /**
   * Asynchronously create InvestorLocks account for a wallet.
   * @param args - {@link CreateOrCloseInvestorLocksArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to a transaction instruction.
   * */
  async createInvestorLocks(
    args: CreateOrCloseInvestorLocksArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    return this.rbacProgram.methods
      .createInvestorLocks()
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        wallet: args.owner,
        controllerAuthority: deriveControllerAuthorityPda(
          assetAccessController
        ),
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        tokenLocksProgram: TL_PROGRAM,
        investorLocks: deriveInvestorLocks(
          args.investorId,
          identityRegistry,
        ),
        investor: deriveInvestorPda(args.investorId, identityRegistry),
        identityAccount: getIdentityAccountPda(args.assetMint, args.owner.toString()),
        assetMint: args.assetMint,
        lockedTokenAccount: deriveLockedTokenAccount(args.investorId, identityRegistry),
        assetController: getAssetControllerPda(args.assetMint),
        assetControllerProgram: assetControllerProgramId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Asynchronously close InvestorLocks account for a wallet.
   * @param args - {@link CreateOrCloseInvestorLocksArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to a transaction instruction.
   * */
  async closeInvestorLocks(
    args: CreateOrCloseInvestorLocksArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    return this.rbacProgram.methods
      .closeInvestorLocks()
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        tokenLocksProgram: TL_PROGRAM,
        investorLocks: deriveInvestorLocks(
          args.investorId,
          identityRegistry,
        ),
        investor: deriveInvestorPda(args.investorId, identityRegistry),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        wallet: args.owner,
        lockedTokenAccount: deriveLockedTokenAccount(args.investorId, identityRegistry),
      })
      .instruction();
  }

  /**
   * Asynchronously add a lock to InvestorLocks.
   * @param args - {@link AddTokenLockArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to a transaction instruction.
   * */
  async addTokenLock(
    args: AddTokenLockArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const assetController = getAssetControllerPda(args.assetMint);
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const investorLocks = deriveInvestorLocks(
      args.investorId,
      identityRegistry,
    );
    const investor = deriveInvestorPda(args.investorId, identityRegistry);
    const unlockedTokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      args.wallet,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const ix = await this.tokenLocksProgram.methods
      .addTokenLock(
        args.value,
        args.releaseTime,
        args.reasonCode,
        args.reasonString
      )
      .accountsStrict({
        payer: args.payer,
        authority: controllerAuthority,
        investorLocks,
        investor,
        assetMint: args.assetMint,
        identityAccount: getIdentityAccountPda(args.assetMint, args.owner.toString()),
        unlockedTokenAccount,
        lockedTokenAccount: deriveLockedTokenAccount(args.investorId, identityRegistry),
        assetController,
        assetControllerProgram: assetControllerProgramId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        identityRegistry: getIdentityRegistryPda(args.assetMint),
        systemProgram: SystemProgram.programId,
        walletIdentityAccount: getWalletIdentityAccountPda(
          args.assetMint,
          args.wallet.toString()
        ),
      })
      .instruction();

    return this.rbacProgram.methods
      .addTokenLock(ix.data)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        tokenLocksProgram: TL_PROGRAM,
        investorLocks,
        investor,
        assetMint: args.assetMint,
        unlockedTokenAccount,
        lockedTokenAccount: deriveLockedTokenAccount(args.investorId, identityRegistry),
        assetController,
        identityRegistry: getIdentityRegistryPda(args.assetMint),
        assetControllerProgram: assetControllerProgramId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        identityAccount: getIdentityAccountPda(args.assetMint, args.owner.toString()),
        walletIdentityAccount: getWalletIdentityAccountPda(
          args.assetMint,
          args.wallet.toString()
        ),
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
          pubkey: getIdentityAccountPda(args.assetMint, args.owner.toString()),
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: getTrackerAccountPda(args.assetMint, args.owner.toString()),
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: getExtraMetasListPda(args.assetMint),
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: getWalletIdentityAccountPda(
            args.assetMint,
            args.owner.toString()
          ),
          isWritable: false,
          isSigner: false,
        },
      ])
      .instruction();
  }

  /**
   * Asynchronously remove a lock from InvestorLocks using RBAC authority.
   * @param args - {@link RemoveTokenLockArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to a transaction instruction.
   * */
  async removeTokenLock(
    args: RemoveTokenLockArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const assetController = getAssetControllerPda(args.assetMint);
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const investorLocks = deriveInvestorLocks(
      args.investorId,
      identityRegistry,
    );
    const investor = deriveInvestorPda(args.investorId, identityRegistry);
    const unlockedTokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      args.wallet,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );

    return this.rbacProgram.methods
      .removeTokenLock(args.index)
      .accountsStrict({
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        tokenLocksProgram: TL_PROGRAM,
        investorLocks,
        investor,
        identityAccount: getIdentityAccountPda(args.assetMint, args.owner.toString()),
        walletIdentityAccount: getWalletIdentityAccountPda(
          args.assetMint,
          args.wallet.toString()
        ),
        assetMint: args.assetMint,
        unlockedTokenAccount,
        lockedTokenAccount: deriveLockedTokenAccount(args.investorId, identityRegistry),
        assetController,
        identityRegistry: getIdentityRegistryPda(args.assetMint),
        assetControllerProgram: assetControllerProgramId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
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
          pubkey: getIdentityAccountPda(args.assetMint, args.owner.toString()),
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: getTrackerAccountPda(args.assetMint, args.owner.toString()),
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: getExtraMetasListPda(args.assetMint),
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: getWalletIdentityAccountPda(
            args.assetMint,
            args.owner.toString()
          ),
          isWritable: false,
          isSigner: false,
        },
      ])
      .instruction();
  }

  /**
   * Asynchronously fetches a token account.
   * @param account - Account to load.
   * @returns A Promise that resolves to a token account.
   * */
  async fetchTokenAccount(
    account: PublicKey,
    commitment: Commitment = "processed"
  ) {
    return getAccount(
      this.rwaClient.provider.connection,
      account,
      commitment,
      TOKEN_2022_PROGRAM_ID
    );
  }
}
