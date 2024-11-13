import { Program } from "@coral-xyz/anchor";
import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  AttachPolicyArgs,
  DetachPolicyArgs,
  getCreatePolicyAccountIx,
  getPolicyAccountPda,
  getPolicyEnginePda,
  policyEngineProgramId,
  RwaClient,
} from "@bridgesplit/rwa-token-sdk";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

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
   * Asynchronously create a policy account to assets.
   * @param args - {@link AttachPolicyArgs}
   * @param signer - User signer public key.
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to attach a policy.
   * */
  async createPolicy(
    args: AttachPolicyArgs,
    signer: PublicKey,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    const { ixs } = await getCreatePolicyAccountIx(
      args,
      this.rwaClient.provider
    );
    const ixData = ixs[0].data;
    return this.rbacProgram.methods
      .createPolicyAccount(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngine: getPolicyEnginePda(args.assetMint),
        policyAccount: getPolicyAccountPda(args.assetMint),
        policyEngineProgram: policyEngineProgramId,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
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
      .attachToPolicyAccount(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        policyAccount: getPolicyAccountPda(args.assetMint),
        systemProgram: SystemProgram.programId,
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
      .detachFromPolicyAccount(ixData)
      .accountsStrict({
        payer: args.payer,
        user: signer,
        controllerAuthority: args.authority,
        assetAccessController,
        authorizedUserRole: authorizedUserRole || null,
        policyEngineProgram: policyEngineProgramId,
        policyEngine: getPolicyEnginePda(args.assetMint),
        policyAccount: getPolicyAccountPda(args.assetMint),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }
}
