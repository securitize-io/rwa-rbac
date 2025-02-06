import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  AttachPolicyArgs,
  DetachPolicyArgs,
  getPolicyEnginePda,
  policyEngineProgramId,
  ChangeCountersArgs,
  ChangeCounterLimitsArgs,
  RwaClient,
  ChangeMappingArgs,
  ChangeIssuancePoliciesArgs,
  SetCountersArgs,
  AddLockArgs,
  RemoveLockArgs,
  getIdentityRegistryPda,
  getIdentityAccountPda,
  getTrackerAccountPda,
  getPolicyEngineEventAuthority,
} from "@dstoken-solana/rwa-token-sdk";

/**
 * Represents the role-based access client for Policy Engine for an RWA.
 */
export class PolicyEngine {
  rwaClient: RwaClient;
  rbacProgram: Program<RwaRbac>;

  constructor(rwaClient: RwaClient, rbacProgram: Program<RwaRbac>) {
    this.rwaClient = rwaClient;
    this.rbacProgram = rbacProgram;
  }

  /**
   * Asynchronously attaches a policy to the policy account.
   * @param args - {@link AttachPolicyArgs}
   * @param signer - User signer public key.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to attach a policy.
   * */
  async attachPolicy(
    args: AttachPolicyArgs,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const policyIx = await this.rwaClient.policyEngine.attachPolicy(args);
    const ixData = policyIx.ixs[0].data;
    return this.rbacProgram.methods
      .attachToPolicyEngine(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        systemProgram: SystemProgram.programId,
        eventAuthority: getPolicyEngineEventAuthority(),
      })
      .instruction();
  }

  /**
   * Asynchronously detaches a policy to the policy account.
   * @param args - {@link DetachPolicyArgs}
   * @param signer - User signer public key.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to detach a policy.
   * */
  async detachPolicy(
    args: DetachPolicyArgs,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const policyIx = await this.rwaClient.policyEngine.detachPolicy(args);
    const ixData = policyIx.ixs[0].data;
    return this.rbacProgram.methods
      .detachFromPolicyEngine(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        systemProgram: SystemProgram.programId,
        eventAuthority: getPolicyEngineEventAuthority(),
      })
      .instruction();
  }

  /**
   * Asynchronously changes counters on the policy account.
   * @param args - {@link ChangeCountersArgs}
   * @param signer - User signer public key.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to change the counters.
   * */
  async changeCounters(
    args: ChangeCountersArgs,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const policyIx = await this.rwaClient.policyEngine.changeCounters(args);
    const ixData = policyIx.ixs[0].data;
    return this.rbacProgram.methods
      .changeCounters(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        systemProgram: SystemProgram.programId,
        eventAuthority: getPolicyEngineEventAuthority(),
      })
      .instruction();
  }

  /**
   * Asynchronously sets counter values on the policy account.
   * @param args - {@link SetCountersArgs}
   * @param signer - User signer public key.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to set the counter values.
   * */
  async setCounters(
    args: SetCountersArgs,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const policyIx = await this.rwaClient.policyEngine.setCounters(args);
    const ixData = policyIx.ixs[0].data;
    return this.rbacProgram.methods
      .setCounters(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        eventAuthority: getPolicyEngineEventAuthority(),
      })
      .instruction();
  }

  /**
   * Asynchronously changes counters limits on the policy account.
   * @param args - {@link ChangeCounterLimitsArgs}
   * @param signer - User signer public key.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to change the counters limits.
   * */
  async changeCounterLimits(
    args: ChangeCounterLimitsArgs,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const policyIx = await this.rwaClient.policyEngine.changeCounterLimits(
      args
    );
    const ixData = policyIx.ixs[0].data;
    return this.rbacProgram.methods
      .changeCounterLimits(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        systemProgram: SystemProgram.programId,
        eventAuthority: getPolicyEngineEventAuthority(),
      })
      .instruction();
  }

  /**
   * Asynchronously changes the levels mapping used in Policy Engine.
   * @param args - {@link ChangeMappingArgs}
   * @param signer - User signer public key.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * */
  async changeMapping(
    args: ChangeMappingArgs,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const policyIx = await this.rwaClient.policyEngine.changeMapping(args);
    const ixData = policyIx.ixs[0].data;
    return this.rbacProgram.methods
      .changeMapping(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        eventAuthority: getPolicyEngineEventAuthority(),
      })
      .instruction();
  }

  /**
   * Asynchronously changes the issuance policies enforced by Policy Engine.
   * @param args - {@link ChangeIssuancePoliciesArgs}
   * @param signer - User signer public key.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * */
  async changeIssuancePolicies(
    args: ChangeIssuancePoliciesArgs,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const policyIx = await this.rwaClient.policyEngine.changeIssuancePolicies(
      args
    );
    const ixData = policyIx.ixs[0].data;
    return this.rbacProgram.methods
      .changeIssuancePolicies(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        eventAuthority: getPolicyEngineEventAuthority(),
      })
      .instruction();
  }

  async addLock(
    args: AddLockArgs,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const policyIx = await this.rwaClient.policyEngine.addLock(args);
    const ixData = policyIx.ixs[0].data;
    return this.rbacProgram.methods
      .addLock(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        systemProgram: SystemProgram.programId,
        assetMint: new PublicKey(args.assetMint),
        identityRegistry: getIdentityRegistryPda(args.assetMint),
        identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
        trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
        eventAuthority: getPolicyEngineEventAuthority(),
      })
      .instruction();
  }

  async removeLock(
    args: RemoveLockArgs,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const policyIx = await this.rwaClient.policyEngine.removeLock(args);
    const ixData = policyIx.ixs[0].data;
    return this.rbacProgram.methods
      .removeLock(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        systemProgram: SystemProgram.programId,
        assetMint: new PublicKey(args.assetMint),
        identityRegistry: getIdentityRegistryPda(args.assetMint),
        identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
        trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
        eventAuthority: getPolicyEngineEventAuthority(),
      })
      .instruction();
  }
}
