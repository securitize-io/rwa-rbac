import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import { RwaRbac } from "../types/generated/rwa_rbac";
import { RwaImr } from "../types/generated/rwa_imr";
import { deriveControllerAuthorityPda, deriveInvestorPda } from "../pdas";
import {
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getPolicyEnginePda,
  getPolicyEngineProgram,
  getPolicyEnginerEventAuthority,
  getTrackerAccountPda,
  getWalletIdentityAccountPda,
  identityRegistryProgramId,
  IxReturn,
  policyEngineProgramId,
  RwaClient,
} from "@dstoken-solana/rwa-token-sdk";
import { IMR_PROGRAM } from "../constants";
import {
  AddLevelsArgs,
  AttachWalletByInvestorArgs,
  ChangeCountryArgs,
  RemoveInvestorArgs,
  RemoveLevelsArgs,
  SetupInvestorArgs,
} from "../types/instructions";

/**
 * Role-based access client for accessing Identity Metadata Registry.
 */
export class IdentityMetadataRegistry {
  rwaClient: RwaClient;
  rbacProgram: Program<RwaRbac>;
  imrProgram: Program<RwaImr>;

  constructor(
    rwaClient: RwaClient,
    rbacProgram: Program<RwaRbac>,
    imrProgram: Program<RwaImr>
  ) {
    this.rwaClient = rwaClient;
    this.rbacProgram = rbacProgram;
    this.imrProgram = imrProgram;
  }

  /**
   * Asynchronously generates instructions to setup an investor.
   * @param args - {@link SetupInvestorArgs}
   * @param authority - RBAC AssetAccessController ControllerAuthority.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to setup an investor.
   *
   * It is required for at least a single user to be setup before issuing tokens.
   */
  async setupUserIxns(
    args: SetupInvestorArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<IxReturn> {
    const returnIxs = [];

    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const investor = deriveInvestorPda(args.investorId, identityRegistry);
    const identityAccount = getIdentityAccountPda(
      args.assetMint,
      investor.toString() // Investor is owner of IdentityAccount
    );
    const assetMintKey = new PublicKey(args.assetMint);

    const registerIx = await this.imrProgram.methods
      .registerInvestor(
        args.investorId,
        args.collisionHash,
        args.levels[0],
        args.expiries[0],
        args.country,
        args.proofHashes[0]
      )
      .accountsStrict({
        payer: args.payer,
        authority: controllerAuthority,
        investor,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
        walletIdentity: getWalletIdentityAccountPda(
          args.assetMint,
          investor.toString() // Investor is owner of IdentityAccount
        ),
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    returnIxs.push(
      await this.rbacProgram.methods
        .registerInvestor(registerIx.data)
        .accountsStrict({
          payer: args.payer,
          user: args.signer,
          controllerAuthority,
          assetAccessController,
          authorizedUserRole: authorizedUserRole || null,
          identityMetadataRegistryProgram: IMR_PROGRAM,
          investor,
          identityRegistryProgram: identityRegistryProgramId,
          identityRegistry,
          identityAccount,
          walletIdentity: getWalletIdentityAccountPda(
            args.assetMint,
            investor.toString()
          ),
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    const policyProgram = getPolicyEngineProgram(this.imrProgram.provider);
    const trackerAccount = PublicKey.findProgramAddressSync(
      [assetMintKey.toBuffer(), identityAccount.toBuffer()],
      policyProgram.programId
    )[0];
    returnIxs.push(
      await policyProgram.methods
        .createTrackerAccount()
        .accountsStrict({
          payer: args.payer,
          trackerAccount,
          systemProgram: SystemProgram.programId,
          program: policyProgram.programId,
          assetMint: assetMintKey,
          eventAuthority: getPolicyEnginerEventAuthority(),
          identityRegistry,
          identityAccount,
        })
        .instruction()
    );

    if (args.levels.length > 1) {
      returnIxs.push(
        await this.addLevels(
          {
            payer: args.payer,
            signer: args.signer,
            investorId: args.investorId,
            assetMint: args.assetMint,
            levels: args.levels.slice(1),
            expiries: args.expiries.slice(1),
            proofHashes: args.proofHashes.slice(1),
            enforceLimits: args.enforceLimits,
          },
          assetAccessController,
          authorizedUserRole
        )
      );
    }

    return {
      ixs: returnIxs,
      signers: [],
    };
  }

  /**
   * Asynchronously add levels to investor.
   * @param args - {@link AddLevelsArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to add levels.
   * */
  async addLevels(
    args: AddLevelsArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const investor = deriveInvestorPda(args.investorId, identityRegistry);
    const identityAccount = getIdentityAccountPda(
      args.assetMint,
      investor.toString()
    );
    const trackerAccount = getTrackerAccountPda(
      args.assetMint,
      investor.toString()
    );

    const ix = await this.imrProgram.methods
      .addLevels(
        Buffer.from(args.levels),
        args.expiries,
        args.proofHashes,
        args.enforceLimits ?? false
      )
      .accountsStrict({
        payer: args.payer,
        authority: controllerAuthority,
        investor,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
        systemProgram: SystemProgram.programId,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        trackerAccount,
        assetMint: args.assetMint,
      })
      .instruction();

    return this.rbacProgram.methods
      .addLevels(ix.data)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityMetadataRegistryProgram: IMR_PROGRAM,
        investor,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
        systemProgram: SystemProgram.programId,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        trackerAccount,
        assetMint: args.assetMint,
      })
      .instruction();
  }

  /**
   * Asynchronously change country for the Investor.
   * @param args - {@link ChangeCountryArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to change the country.
   * */
  async changeCountry(
    args: ChangeCountryArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const investor = deriveInvestorPda(args.investorId, identityRegistry);
    const identityAccount = getIdentityAccountPda(
      args.assetMint,
      investor.toString()
    );
    const trackerAccount = getTrackerAccountPda(
      args.assetMint,
      investor.toString()
    );

    const ix = await this.imrProgram.methods
      .changeCountry(args.country, args.enforceLimits ?? false)
      .accountsStrict({
        payer: args.payer,
        authority: controllerAuthority,
        investor,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        trackerAccount,
        assetMint: args.assetMint,
      })
      .instruction();

    return this.rbacProgram.methods
      .changeCountry(ix.data)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityMetadataRegistryProgram: IMR_PROGRAM,
        investor,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        trackerAccount,
        assetMint: args.assetMint,
      })
      .instruction();
  }

  /**
   * Asynchronously remove levels from an investor.
   * @param args - {@link RemoveLevelsArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to remove levels.
   * */
  async removeLevels(
    args: RemoveLevelsArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const investor = deriveInvestorPda(args.investorId, identityRegistry);
    const identityAccount = getIdentityAccountPda(
      args.assetMint,
      investor.toString()
    );
    const trackerAccount = getTrackerAccountPda(
      args.assetMint,
      investor.toString()
    );

    const ix = await this.imrProgram.methods
      .removeLevels(Buffer.from(args.levels), args.enforceLimits ?? false)
      .accountsStrict({
        payer: args.payer,
        authority: controllerAuthority,
        investor,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
        systemProgram: SystemProgram.programId,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        trackerAccount,
        assetMint: args.assetMint,
      })
      .instruction();

    return this.rbacProgram.methods
      .removeLevels(ix.data)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityMetadataRegistryProgram: IMR_PROGRAM,
        investor,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
        systemProgram: SystemProgram.programId,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        trackerAccount,
        assetMint: args.assetMint,
      })
      .instruction();
  }

  /**
   * Asynchronously remove an investor.
   * @param args - {@link RemoveLevelsArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to remove an investor.
   * */
  async removeInvestor(
    args: RemoveInvestorArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const investor = deriveInvestorPda(args.investorId, identityRegistry);
    const identityAccount = getIdentityAccountPda(
      args.assetMint,
      investor.toString()
    );

    return this.rbacProgram.methods
      .removeInvestor()
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityMetadataRegistryProgram: IMR_PROGRAM,
        investor,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
        walletIdentity: getWalletIdentityAccountPda(
          args.assetMint,
          investor.toString()
        ),
      })
      .instruction();
  }

  /**
   * Asynchronously attach a wallet to IdentityAccouont for the Investor.
   * @param args - {@link AttachWalletByInvestorArgs}
   * */
  async attachWalletByInvestor(
    args: AttachWalletByInvestorArgs
  ): Promise<TransactionInstruction> {
    const identityRegistry = getIdentityRegistryPda(args.assetMint);
    const investor = deriveInvestorPda(args.investorId, identityRegistry);
    const identityAccount = getIdentityAccountPda(
      args.assetMint,
      investor.toString()
    );
    return this.imrProgram.methods
      .attachWalletByInvestor(args.newWallet)
      .accountsStrict({
        payer: args.payer,
        wallet: args.signer,
        investor,
        walletIdentity: getWalletIdentityAccountPda(
          args.assetMint,
          args.signer
        ),
        identityRegistryProgram: identityRegistryProgramId,
        newWalletIdentity: getWalletIdentityAccountPda(
          args.assetMint,
          args.newWallet.toString()
        ),
        identityAccount,
        identityRegistry,
        assetMint: args.assetMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }
}
