import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { IMR_PROGRAM, RBAC_PROGRAM, TL_PROGRAM } from "./constants";

export const deriveInvestorLocks = (
  investorId: string,
  identityRegistry: PublicKey,
  programId = TL_PROGRAM
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(investorId),
      identityRegistry.toBuffer(),
      Buffer.from("InvestorLocks"),
    ],
    programId
  )[0];
};
export const deriveLockedTokenAccount = (
  investorId: string,
  identityRegistry: PublicKey,
  programId = TL_PROGRAM
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(investorId),
      identityRegistry.toBuffer(),
      Buffer.from("LockedTokenAccount"),
    ],
    programId
  )[0];
};

export const deriveInvestorPda = (
  investorId: string,
  identityRegistry: PublicKey,
  programId = IMR_PROGRAM
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(investorId),
      identityRegistry.toBuffer(),
      Buffer.from("Investor"),
    ],
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
  uniqueSeed: PublicKey,
  programId = RBAC_PROGRAM
) => {
  return PublicKey.findProgramAddressSync(
    [uniqueSeed.toBuffer(), Buffer.from("AssetAccessController")],
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
