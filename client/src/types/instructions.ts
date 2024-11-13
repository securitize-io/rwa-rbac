import { CommonArgs } from "@bridgesplit/rwa-token-sdk/dist";
import { PublicKey } from "@solana/web3.js";

/** Args used to setup a AssetAccessController  */
export type CreateControllerArgs = {
  payer: PublicKey;
  admin: PublicKey;
  uniqueSeed: number;
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

/** Args used to assign users to a UserRole  */
export type AssignUserRoleArgs = {
  payer: PublicKey;
  user: PublicKey;
  userRole: PublicKey;
  usersToAssign: PublicKey[];
  assetAccessController: PublicKey;
  authorizedUserRole?: PublicKey;
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
