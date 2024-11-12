import { Program } from "@coral-xyz/anchor";
import { RwaRbac } from "../types/generated/rwa_rbac";
import {
  AddLevelToIdentityAccountArgs,
  CommonArgs,
  IxReturn,
  RemoveLevelFromIdentityAccountArgs,
  RwaClient,
  SetupUserArgs,
} from "@bridgesplit/rwa-token-sdk";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

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
   * Asynchronously generates instructions to setup a user.
   * @param - {@link SetupUserArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to setup a user.
   *
   * It is required for at least a single user to be setup before issuing tokens.
   */
  async setupUserIxns(
    setupUserArgs: SetupUserArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<IxReturn> {
    // TODO: Complete this.
    return;
  }

  /**
   * Asynchronously update user account identity
   * @param - {@link AddLevelToIdentityAccountArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to update user account identity.
   * */
  async addIdentityLevelToUserAccount(
    addLevelArgs: AddLevelToIdentityAccountArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    // TODO: Complete this.
    return;
  }

  /**
   * Asynchronously reduces a user identity account level
   * @param - {@link RemoveLevelFromIdentityAccount}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to the instructions to reduce the level of a user identity account.
   */
  async removeIdentityLevelFromUserAccount(
    removeLevelArgs: RemoveLevelFromIdentityAccountArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    // TODO: Complete this.
    return;
  }

  /**
   * Asynchronously generates instruction to revoke an identity account.
   * @param - {@link CommonArgs}
   * @param assetAccessController - RBAC AssetAccessController account.
   * @param authorizedUserRole - Optional UserRole account. Required if user is not an admin.
   * @returns A Promise that resolves to revoke an identity account.
   * */
  async revokeIdentityIxn(
    args: CommonArgs,
    assetAccessController: PublicKey,
    authorizedUserRole?: PublicKey
  ): Promise<TransactionInstruction> {
    // TODO: Complete this
    return;
  }
}
