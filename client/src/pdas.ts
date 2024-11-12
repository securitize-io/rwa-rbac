import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { RBAC_PROGRAM } from "./constants";

export const deriveAssetAccessControllerPda = (
  uniqueSeed: BN,
  programId = RBAC_PROGRAM
) => {
  return PublicKey.findProgramAddressSync(
    [
      uniqueSeed.toArrayLike(Buffer, "le", 8),
      Buffer.from("AssetAccessController"),
    ],
    programId
  )[0];
};

export const deriveControllerAuthorityPda = (
  assetAccessController: PublicKey,
  programId = RBAC_PROGRAM
) => {
  return PublicKey.findProgramAddressSync(
    [assetAccessController.toBuffer()],
    programId
  )[0];
};

export const deriveUserRolePda = (
  id: BN,
  assetAccessController: PublicKey,
  programId = RBAC_PROGRAM
) => {
  return PublicKey.findProgramAddressSync(
    [
      id.toArrayLike(Buffer, "le", 8),
      assetAccessController.toBuffer(),
      Buffer.from("UserRole"),
    ],
    programId
  )[0];
};
