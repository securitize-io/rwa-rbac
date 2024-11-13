import {
  getIdentityRegistryPda,
  identityRegistryProgramId,
} from "@bridgesplit/rwa-token-sdk";
import { BN, getProvider } from "@coral-xyz/anchor";
import {
  ConfirmOptions,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { pdas, RBAC_PROGRAM } from "../client/src";
import { Config } from "@bridgesplit/rwa-token-sdk/dist/classes/types";

export const getIdentityMetadataPda = (assetMint: string, level: number) =>
  PublicKey.findProgramAddressSync(
    [
      new BN(level).toArrayLike(Buffer, "le", 1),
      getIdentityRegistryPda(assetMint).toBuffer(),
    ],
    identityRegistryProgramId
  )[0];

export async function setupTests(uniqueSeed: number) {
  const payerKp = new Keypair();
  const signer1Kp = new Keypair();
  const signer2Kp = new Keypair();
  const signer3Kp = new Keypair();
  const user1Kp = new Keypair();
  const user2Kp = new Keypair();
  const user3Kp = new Keypair();
  const provider = getProvider();

  // airdrop to all users
  const txns = await Promise.all([
    provider.connection.requestAirdrop(payerKp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(signer1Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(signer2Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(signer3Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user1Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user2Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user3Kp.publicKey, LAMPORTS_PER_SOL),
  ]);

  await Promise.all(
    txns.map((txn) => provider.connection.confirmTransaction(txn, "finalized"))
  );

  const controller = pdas.deriveAssetAccessControllerPda(new BN(uniqueSeed));
  const roleId1 = new BN(1);
  const roleId2 = new BN(2);
  const userRole1 = pdas.deriveUserRolePda(roleId1, controller);
  const userRole2 = pdas.deriveUserRolePda(roleId2, controller);

  const [controllerAuthority, controllerAuthorityBump] =
    PublicKey.findProgramAddressSync([controller.toBuffer()], RBAC_PROGRAM);

  const connectionUrl = process.env.RPC_URL ?? "http://localhost:8899";
  const connection = new Connection(connectionUrl, "processed");
  const config: Config = {
    connection,
    rpcUrl: connectionUrl,
    confirmationOptions: {
      skipPreflight: false,
      maxRetries: 3,
      commitment: "processed",
    },
  };

  return {
    config,
    payerKp,
    payer: payerKp.publicKey,
    signer1Kp,
    signer1: signer1Kp.publicKey,
    signer2Kp,
    signer2: signer2Kp.publicKey,
    signer3Kp,
    signer3: signer3Kp.publicKey,
    provider,
    user1Kp,
    user1: user1Kp.publicKey,
    user2Kp,
    user2: user2Kp.publicKey,
    user3Kp,
    user3: user3Kp.publicKey,
    uniqueSeed,
    assetAccessController: controller,
    controllerAuthority,
    controllerAuthorityBump,
    roleId1,
    roleId2,
    userRole1,
    userRole2,
  };
}
