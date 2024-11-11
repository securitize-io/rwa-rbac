import {
  getIdentityRegistryPda,
  identityRegistryProgramId,
} from "@bridgesplit/rwa-token-sdk";
import { BN, getProvider } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

export const RBAC_PROGRAM = new PublicKey(
  "9gUXb1jJ4wmwht3G6mMaHdWbo2gf7faHYyM6ryVGy4ae"
);

export const getIdentityMetadataPda = (assetMint: string, level: number) =>
  PublicKey.findProgramAddressSync(
    [
      new BN(level).toArrayLike(Buffer, "le", 1),
      getIdentityRegistryPda(assetMint).toBuffer(),
    ],
    identityRegistryProgramId
  )[0];

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

export async function setupTests(uniqueSeed: number) {
  const payerKp = new Keypair();
  const authorityKp = new Keypair();
  const delegateKp = new Keypair();
  const user1Kp = new Keypair();
  const user2Kp = new Keypair();
  const user3Kp = new Keypair();
  const provider = getProvider();

  // airdrop to all users
  const txns = await Promise.all([
    provider.connection.requestAirdrop(payerKp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(authorityKp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(delegateKp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user1Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user2Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user3Kp.publicKey, LAMPORTS_PER_SOL),
  ]);

  await Promise.all(
    txns.map((txn) => provider.connection.confirmTransaction(txn, "finalized"))
  );

  const controller = deriveAssetAccessControllerPda(new BN(uniqueSeed));
  const roleId1 = new BN(1);
  const roleId2 = new BN(2);
  const userRole1 = deriveUserRolePda(roleId1, controller);
  const userRole2 = deriveUserRolePda(roleId2, controller);

  const [controllerAuthority, controllerAuthorityBump] =
    PublicKey.findProgramAddressSync([controller.toBuffer()], RBAC_PROGRAM);
  return {
    payerKp,
    payer: payerKp.publicKey,
    authorityKp,
    authority: authorityKp.publicKey,
    delegateKp,
    delegate: delegateKp.publicKey,
    provider,
    user1Kp,
    user1: user1Kp.publicKey,
    user2Kp,
    user2: user2Kp.publicKey,
    user3Kp,
    user3: user3Kp.publicKey,
    assetAccessController: controller,
    controllerAuthority,
    controllerAuthorityBump,
    userRole1,
    userRole2,
  };
}
