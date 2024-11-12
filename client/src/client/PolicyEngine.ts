import { Program } from "@coral-xyz/anchor";
import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  AttachPolicyArgs,
  DetachPolicyArgs,
  RwaClient,
} from "@bridgesplit/rwa-token-sdk";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

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
   * @param - {@link AttachPolicyArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to attach a policy.
   * */
  async createPolicy(
    policyArgs: AttachPolicyArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    // TODO: Complete this
    return;
  }

  /**
   * Asynchronously attaches a policy to the policy account.
   * @param - {@link AttachPolicyArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to attach a policy.
   * */
  async attachPolicy(
    policyArgs: AttachPolicyArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    // TODO: Complete this
    return;
  }

  /**
   * Asynchronously detaches a policy to the policy account.
   * @param - {@link DetachPolicyArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to detach a policy.
   * */
  async detachPolicy(
    policyArgs: DetachPolicyArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    // TODO: Complete this
    return;
  }
}
