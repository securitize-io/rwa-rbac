import { Program } from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  AttachDetachWalletArgs,
  RefreshLevelArgs,
} from "../types/instructions";
import {
  AddLevelToIdentityAccountArgs,
  ChangeCountryArgs,
  getAddLevelToIdentityAccount,
  getChangeCountryIx,
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getIdentityRegistryProgram,
  getPolicyEnginePda,
  getRemoveLevelFromIdentityAccount,
  getTrackerAccountPda,
  getWalletIdentityAccountPda,
  identityRegistryProgramId,
  IxReturn,
  policyEngineProgramId,
  RemoveLevelFromIdentityAccountArgs,
  RwaClient,
  SetupUserArgs,
} from "../../../deps/rwa-token/clients/rwa-token-sdk/src";
import {
  deriveControllerAuthorityPda,
  deriveIdentityToOwnerPda,
} from "../pdas";
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
   * Asynchronously generates instructions to setup a non-investor user with an identity account.
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
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<IxReturn> {
    const { ixs } = await this.rwaClient.identityRegistry.setupUserIxns(args);
    const returnIxs = [];

    const identityAccountIx = ixs[0];
    const addLevelIx = ixs[2];
    const trackerAccountIx = ixs[1];
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
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    returnIxs.push(trackerAccountIx);

    if (args.levels.length > 1) {
      returnIxs.push(
        await this.rbacProgram.methods
          .addLevelToIdentityAccount(addLevelIx.data)
          .accountsStrict({
              payer: args.payer,
              user: args.signer,
              controllerAuthority,
              assetAccessController,
              authorizedUserRole: authorizedUserRole || null,
              identityRegistryProgram: identityRegistryProgramId,
              identityRegistry: getIdentityRegistryPda(args.assetMint),
              identityAccount,
              identityToInvestor: deriveIdentityToOwnerPda(identityAccount),
              systemProgram: SystemProgram.programId,
              policyEngineProgram: policyEngineProgramId,
              policyEngine: getPolicyEnginePda(args.assetMint),
              trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
              assetMint: args.assetMint,
            })
            .instruction()
      );
    }

    return {
      ixs: returnIxs,
      signers: [],
    };
  }

  /**
   * Asynchronously update a non-investor user identity account level.
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
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    return this.rbacProgram.methods
      .addLevelToIdentityAccount(ixData)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry: getIdentityRegistryPda(args.assetMint),
        identityAccount,
        identityToInvestor: deriveIdentityToOwnerPda(identityAccount),
        systemProgram: SystemProgram.programId,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
        assetMint: args.assetMint,

      })
      .instruction();
  }
  /**
   * Asynchronously reduces a non-Investor user identity account level.
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
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const identityAccount = getIdentityAccountPda(args.assetMint, args.owner);
    return this.rbacProgram.methods
      .removeLevelFromIdentityAccount(ixData)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry: getIdentityRegistryPda(args.assetMint),
        identityAccount,
        identityToInvestor: deriveIdentityToOwnerPda(identityAccount),
        systemProgram: SystemProgram.programId,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
        assetMint: args.assetMint,
      })
      .instruction();
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
    const controllerAuthority = deriveControllerAuthorityPda(
      assetAccessController
    );
    const refreshIx = await identityProgram.methods
      .refreshLevelToIdentityAccount(args.level, args.expiry)
      .accountsStrict({
        payer: args.payer,
        signer: controllerAuthority,
        identityRegistry,
        identityAccount,
      })
      .instruction();
    return this.rbacProgram.methods
      .refreshLevelToIdentityAccount(refreshIx.data)
      .accountsStrict({
        payer: args.payer,
        user: args.signer,
        controllerAuthority,
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
    const newWalletIdentityAccount = getIdentityAccountPda(args.assetMint, args.wallet);
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
        newWalletIdentityAccount
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
        newWalletIdentityAccount
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
