import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import { RwaRbac } from "../types/generated/rwa_rbac";
import { RwaImr } from "../types/generated/rwa_imr";
import {
  deriveControllerAuthorityPda,
  deriveIdentityToOwnerPda,
  deriveInvestorPda,
} from "../pdas";
import {
  getCreateTrackerAccountIx,
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getPolicyEnginePda,
  getTrackerAccountPda,
  identityRegistryProgramId,
  IxReturn,
  policyEngineProgramId,
  RwaClient,
} from "../../../deps/rwa-token/clients/rwa-token-sdk/src";
import { IMR_PROGRAM } from "../constants";
import {
  AddLevelsArgs,
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
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);
    const identityToInvestor = deriveIdentityToOwnerPda(identityAccount);

    const registerIx = await this.imrProgram.methods
      .registerInvestor(
        args.investorId,
        args.collisionHash,
        new PublicKey(args.owner),
        args.levels[0],
        args.expiries[0],
        args.country,
        args.proofHashes[0]
      )
      .accountsStrict({
        payer: args.payer,
        authority: controllerAuthority,
        investor,
        identityToInvestor,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
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
          identityToInvestor,
          identityRegistryProgram: identityRegistryProgramId,
          identityRegistry,
          identityAccount,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    returnIxs.push(
      await getCreateTrackerAccountIx(
        {
          payer: args.payer,
          owner: args.owner,
          assetMint: args.assetMint,
        },
        this.rwaClient.provider
      )
    );

    if (args.levels.length > 1) {
      returnIxs.push(
        await this.addLevels(
          {
            payer: args.payer,
            signer: args.signer,
            investorId: args.investorId,
            assetMint: args.assetMint,
            owner: args.owner,
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
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);

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
        trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
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
        trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
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
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);

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
        trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
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
        trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
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
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);

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
        trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
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
        trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
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
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);
    const identityToInvestor = deriveIdentityToOwnerPda(identityAccount);

    const ix = await this.imrProgram.methods
      .removeInvestor(new PublicKey(args.owner))
      .accountsStrict({
        payer: args.payer,
        authority: controllerAuthority,
        investor,
        identityToInvestor,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
      })
      .instruction();

    return this.rbacProgram.methods
      .removeInvestor(ix.data)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityMetadataRegistryProgram: IMR_PROGRAM,
        investor,
        identityToInvestor,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry,
        identityAccount,
      })
      .instruction();
  }
}
