import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { CommonArgs } from "../../../deps/rwa-token/clients/rwa-token-sdk/src";

/** Args used to setup a AssetAccessController  */
export type CreateControllerArgs = {
  payer: PublicKey;
  admin: PublicKey;
  uniqueSeed: PublicKey;
};

/** Args used to update admin on AssetAccessController  */
export type UpdateControllerAdminArgs = {
  admin: PublicKey;
  assetAccessController: PublicKey;
  newAdmin: PublicKey;
};

/** Args used to setup a UserRole */
export type SetupUserRoleArgs = {
  payer: PublicKey;
  user: PublicKey;
  assetAccessController: PublicKey;
  name: string;
  allowedAdminIxs: number;
  allowedMediciIxs: number;
  authorizedUserRole?: PublicKey;
};

/** Args used to modify a UserRole */
export type ModifyUserRoleArgs = {
  user: PublicKey;
  assetAccessController: PublicKey;
  userRole: PublicKey;
  name: string;
  allowedAdminIxs: number;
  allowedMediciIxs: number;
  authorizedUserRole?: PublicKey;
};

/** Args used to delete a UserRole */
export type DeleteUserRoleArgs = {
  receiver: PublicKey;
  user: PublicKey;
  assetAccessController: PublicKey;
  userRole: PublicKey;
  authorizedUserRole?: PublicKey;
};

/** Args used to assign users to a UserRole  */
export type AssignUserRoleArgs = {
  payer: PublicKey;
  user: PublicKey;
  userRole: PublicKey;
  usersToAssign: PublicKey[];
  assetAccessController: PublicKey;
  authorizedUserRole?: PublicKey;
};

/** Args used to remove users from a UserRole  */
export type RemoveUserRoleArgs = {
  user: PublicKey;
  userRole: PublicKey;
  usersToRemove: PublicKey[];
  assetAccessController: PublicKey;
  authorizedUserRole?: PublicKey;
};

/** Args used to withdraw excess rent from ControllerAuthority  */
export type WithdrawExcessRentArgs = {
  receiver: PublicKey;
  admin: PublicKey;
  controllerAuthority: PublicKey;
  assetAccessController: PublicKey;
};

/** Args used to seize tokens  */
export type SeizeTokensArgs = {
  payer: string;
  signer: string;
  assetMint: string;
  owner: string;
};

/** Args used to update asset mitn interest rate  */
export type UpdateInterestBearingMintRateArgs = {
  rate: number;
  authority: string;
} & CommonArgs;

/** Args used to revoke identity from registry  */
export type RevokeIdentityArgs = {
  assetMint: string;
  payer: string;
  signer: string;
  owner: string;
  authority: string;
};

/** Args used to refresh expiry on a Identity Account level  */
export type RefreshLevelArgs = {
  assetMint: string;
  payer: string;
  signer: string;
  owner: string;
  authority: string;
  level: number;
  expiry: BN;
};

/** Args used to edit Identity Metadata  */
export type EditIdentityMetadataArgs = {
  assetMint: string;
  payer: string;
  signer: string;
  owner: string;
  authority: string;
  level: number;
  maxAllowed?: BN;
  minAllowed?: BN;
};

/** Args used to setup Investor  */
export type SetupInvestorArgs = {
  payer: string;
  signer: string;
  investorId: string;
  collisionHash: string;
  assetMint: string;
  owner: string;
  levels: number[];
  expiries: BN[];
  proofHashes: string[];
  country: number;
  enforceLimits?: boolean;
};

/** Args used to add levels to Investor  */
export type AddLevelsArgs = {
  payer: string;
  signer: string;
  investorId: string;
  assetMint: string;
  owner: string;
  levels: number[];
  expiries: BN[];
  proofHashes: string[];
  enforceLimits?: boolean;
};

/** Args used to change country of Investor  */
export type ChangeCountryArgs = {
  payer: string;
  signer: string;
  investorId: string;
  assetMint: string;
  owner: string;
  country: number;
  enforceLimits?: boolean;
};

/** Args used to remove levels to Investor  */
export type RemoveLevelsArgs = {
  payer: string;
  signer: string;
  investorId: string;
  assetMint: string;
  owner: string;
  levels: number[];
  enforceLimits?: boolean;
};

/** Args used to remove an Investor  */
export type RemoveInvestorArgs = {
  payer: string;
  signer: string;
  investorId: string;
  assetMint: string;
  owner: string;
};

/** Args used to attach or detach a wallet to an IdentityAccount  */
export type AttachDetachWalletArgs = {
  payer: string;
  signer: string;
  owner: string;
  assetMint: string;
  wallet: string;
};

/** Args used to create InvestorLocks */
export type CreateOrCloseInvestorLocksArgs = {
  payer: string;
  signer: string;
  owner: string;
  investorId: string;
  assetMint: string;
  wallet: PublicKey;
  lockedTokenAccount: PublicKey;
  walletIdentity?: PublicKey;
};

/** Args used to add a token lock */
export type AddTokenLockArgs = {
  payer: string;
  signer: string;
  owner: string;
  wallet: PublicKey; // Same value as owner if owner is to be locked.
  investorId: string;
  assetMint: string;
  value: BN;
  releaseTime: BN;
  reasonCode: BN;
  reasonString: string;
  lockedTokenAccount: PublicKey;
};

/** Args used to remove a token lock */
export type RemoveTokenLockArgs = {
  payer: string;
  signer: string;
  owner: string;
  wallet: PublicKey; // Same value as owner if owner is to be locked.
  investorId: string;
  assetMint: string;
  lockedTokenAccount: PublicKey;
  index: BN;
};
