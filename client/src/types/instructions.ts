import { CommonArgs } from "@bridgesplit/rwa-token-sdk/dist";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

/** Args used to setup a AssetAccessController  */
export type CreateControllerArgs = {
  payer: PublicKey;
  admin: PublicKey;
  uniqueSeed: number;
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
