import { Program, utils } from "@coral-xyz/anchor";
import {
  CompiledInstruction,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import { RwaRbac } from "../types/generated/rwa_rbac";
import { RwaImr } from "../types/generated/rwa_imr";
import {
  deriveControllerAuthorityPda,
  deriveInvestorPda,
  getEventAuthority,
} from "../pdas";
import {
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getPolicyEnginePda,
  getPolicyEngineProgram,
  getPolicyEngineEventAuthority,
  getTrackerAccountPda,
  getWalletIdentityAccountPda,
  identityRegistryProgramId,
  IxReturn,
  policyEngineProgramId,
  RwaClient,
  getIdentityRegistryEventAuthority,
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
   * Parses inner instructions data field for array of events emitted by program using CPI Events.
   * @param ixs - Array of CompiledInstruction from a transaction inner instructions.
   * @returns Array of Events
   * */
  parseEvents(ixs: CompiledInstruction[]) {
    const eventCoder = this.imrProgram.coder.events;
    const events = ixs
      .map(({ data }) => {
        try {
          const buffer = Buffer.from(utils.bytes.bs58.decode(data));
          const event = eventCoder.decode(
            utils.bytes.base64.encode(buffer.slice(8))
          );
          return event;
        } catch (err) {
          console.error("Error decoding events", err);
        }
      })
      .filter((v) => v != null);
    return events;
  }

  /**
   * Asynchronously generates instructions to setup an investor.
   * @param args - {@link SetupInvestorArgs}
   * @param authority - RBAC AssetAccessController ControllerAuthority.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
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
        eventAuthority: getEventAuthority(IMR_PROGRAM),
        eventAuthorityIdentityRegistry: getIdentityRegistryEventAuthority(),
        program: identityRegistryProgramId,
        policyEngineProgram: policyEngineProgramId,
        trackerAccount: getTrackerAccountPda(
          args.assetMint,
          investor.toString()
        ),
        assetMint: assetMintKey,
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
          eventAuthorityIdentityMetadataRegistry:
            getEventAuthority(IMR_PROGRAM),
          eventAuthorityIdentityRegistry: getIdentityRegistryEventAuthority(),
          policyEngineProgram: policyEngineProgramId,
          trackerAccount: getTrackerAccountPda(
            args.assetMint,
            investor.toString()
          ),
          assetMint: assetMintKey,
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
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
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
        eventAuthorityIdentityRegistry: getIdentityRegistryEventAuthority(),
        eventAuthority: getEventAuthority(IMR_PROGRAM),
        program: IMR_PROGRAM,
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
        eventAuthorityIdentityRegistry: getIdentityRegistryEventAuthority(),
        eventAuthorityIdentityMetadataRegistry: getEventAuthority(IMR_PROGRAM),
      })
      .instruction();
  }

  /**
   * Asynchronously change country for the Investor.
   * @param args - {@link ChangeCountryArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
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
        eventAuthorityIdentityRegistry: getIdentityRegistryEventAuthority(),
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
        eventAuthorityIdentityRegistry: getIdentityRegistryEventAuthority(),
      })
      .instruction();
  }

  /**
   * Asynchronously remove levels from an investor.
   * @param args - {@link RemoveLevelsArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
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
        eventAuthorityIdentityRegistry: getIdentityRegistryEventAuthority(),
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
        eventAuthorityIdentityRegistry: getIdentityRegistryEventAuthority(),
      })
      .instruction();
  }

  /**
   * Asynchronously remove an investor.
   * @param args - {@link RemoveLevelsArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - UserRole authorized to invoke instruction.
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
        policyEngineProgram: policyEngineProgramId,
        trackerAccount: getTrackerAccountPda(
          args.assetMint,
          investor.toString()
        ),
        eventAuthorityIdentityMetadataRegistry: getEventAuthority(IMR_PROGRAM),
        eventAuthorityIdentityRegistry: getIdentityRegistryEventAuthority(),
        assetMint: args.assetMint,
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
        eventAuthorityIdentityRegistry: getIdentityRegistryEventAuthority(),
      })
      .instruction();
  }
}
