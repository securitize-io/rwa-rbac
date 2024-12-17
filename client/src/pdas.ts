import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { IMR_PROGRAM, RBAC_PROGRAM, TL_PROGRAM } from "./constants";

export const deriveInvestorLocks = (
  investorId: string,
  identityRegistry: PublicKey,
  wallet: PublicKey,
  programId = TL_PROGRAM
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(investorId),
      identityRegistry.toBuffer(),
      wallet.toBuffer(),
      Buffer.from("InvestorLocks"),
    ],
    programId
  )[0];
};

export const deriveInvestorPda = (
  investorId: string,
  programId = IMR_PROGRAM
) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(investorId), Buffer.from("Investor")],
    programId
  )[0];
};

export const deriveIdentityToOwnerPda = (
  identityAccount: PublicKey,
  programId = IMR_PROGRAM
) => {
  return PublicKey.findProgramAddressSync(
    [identityAccount.toBuffer(), Buffer.from("IdentityToInvestor")],
    programId
  )[0];
};

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
