import { BN, getProvider } from '@anchor-lang/core';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
} from '@solana/web3.js';
import * as multisig from '@sqds/multisig';
import { deriveAssetAccessControllerPda, deriveUserRolePda, RBAC_PROGRAM } from '../client/src';
import { Config } from '@dstoken-solana/rwa-token-sdk';
import { readFileSync } from 'fs';

const SQUADS_VAULT_INDEX = 0;

async function confirmTransaction(connection: Connection, signature: string) {
  const confirmation = await connection.confirmTransaction(signature, 'confirmed');
  if (confirmation.value.err) {
    throw new Error(`Transaction ${signature} failed: ${JSON.stringify(confirmation.value.err)}`);
  }
}

export async function createTestSquadsMultisig({
  connection,
  creator,
  members,
  timeLock,
}: {
  connection: Connection;
  creator: Keypair;
  members: PublicKey[];
  timeLock: number;
}) {
  const createKey = Keypair.generate();
  const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: SQUADS_VAULT_INDEX });
  const [programConfigPda] = multisig.getProgramConfigPda({});
  const programConfig = await multisig.accounts.ProgramConfig.fromAccountAddress(connection, programConfigPda);

  const signature = await multisig.rpc.multisigCreateV2({
    connection,
    treasury: programConfig.treasury,
    createKey,
    creator,
    multisigPda,
    configAuthority: null,
    threshold: 1,
    members: members.map((key) => ({
      key,
      permissions: multisig.types.Permissions.all(),
    })),
    timeLock,
    rentCollector: null,
  });
  await confirmTransaction(connection, signature);

  return { multisigPda, vaultPda };
}

export async function createAndApproveSquadsVaultTransaction({
  connection,
  multisigPda,
  vaultPda,
  member,
  feePayer,
  instruction,
}: {
  connection: Connection;
  multisigPda: PublicKey;
  vaultPda: PublicKey;
  member: Keypair;
  feePayer: Keypair;
  instruction: TransactionInstruction;
}) {
  const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
  const transactionIndex = BigInt(multisigAccount.transactionIndex.toString()) + BigInt(1);
  const transactionMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [instruction],
  });

  const createSignature = await multisig.rpc.vaultTransactionCreate({
    connection,
    feePayer,
    multisigPda,
    transactionIndex,
    creator: member.publicKey,
    vaultIndex: SQUADS_VAULT_INDEX,
    ephemeralSigners: 0,
    transactionMessage,
    signers: [member],
  });
  await confirmTransaction(connection, createSignature);

  const proposalSignature = await multisig.rpc.proposalCreate({
    connection,
    feePayer,
    creator: member,
    multisigPda,
    transactionIndex,
  });
  await confirmTransaction(connection, proposalSignature);

  const approveSignature = await multisig.rpc.proposalApprove({
    connection,
    feePayer,
    member,
    multisigPda,
    transactionIndex,
  });
  await confirmTransaction(connection, approveSignature);

  return transactionIndex;
}

export async function executeSquadsVaultTransaction({
  connection,
  multisigPda,
  transactionIndex,
  member,
  feePayer,
}: {
  connection: Connection;
  multisigPda: PublicKey;
  transactionIndex: bigint;
  member: Keypair;
  feePayer: Keypair;
}) {
  const signature = await multisig.rpc.vaultTransactionExecute({
    connection,
    feePayer,
    multisigPda,
    transactionIndex,
    member: member.publicKey,
    signers: [member],
  });
  await confirmTransaction(connection, signature);
  return signature;
}

export async function advanceSurfpoolClock(connection: Connection, seconds: number) {
  const slot = await connection.getSlot('confirmed');
  const blockTime = await connection.getBlockTime(slot);
  if (blockTime === null) {
    throw new Error(`Surfpool did not return a block time for slot ${slot}`);
  }

  const response = await fetch(connection.rpcEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'surfnet_timeTravel',
      params: [{ absoluteTimestamp: (blockTime + seconds) * 1000 }],
    }),
  });
  const result = (await response.json()) as { error?: unknown };
  if (!response.ok || result.error) {
    throw new Error(`Surfpool time travel failed: ${JSON.stringify(result.error ?? result)}`);
  }
}

export async function setupTests() {
  const keypairData = new Uint8Array(JSON.parse(readFileSync('tests/testSigner.json', 'utf-8')));
  const signer1Kp = Keypair.fromSecretKey(keypairData);
  const signer2Kp = new Keypair();
  const signer3Kp = new Keypair();
  const payerKp = new Keypair();
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

  const blockhash = await provider.connection.getLatestBlockhash('processed');
  await Promise.all(
    txns.map((txn) =>
      provider.connection.confirmTransaction({
        signature: txn,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      })
    )
  );

  const assetMintKp = Keypair.generate();
  const assetMint = assetMintKp.publicKey;
  const controller = deriveAssetAccessControllerPda(assetMint);
  const roleId1 = new BN(1);
  const roleId2 = new BN(2);
  const roleId3 = new BN(3);
  const userRole1 = deriveUserRolePda(roleId1, controller);
  const userRole2 = deriveUserRolePda(roleId2, controller);
  const userRole3 = deriveUserRolePda(roleId3, controller);

  const [controllerAuthority, controllerAuthorityBump] = PublicKey.findProgramAddressSync(
    [controller.toBuffer()],
    RBAC_PROGRAM
  );

  const connectionUrl = process.env.RPC_URL ?? 'http://localhost:8899';
  const connection = new Connection(connectionUrl, 'processed');
  const config: Config = {
    connection,
    rpcUrl: connectionUrl,
    confirmationOptions: {
      skipPreflight: false,
      maxRetries: 3,
      commitment: 'processed',
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
    assetMint,
    assetMintKp,
    assetAccessController: controller,
    controllerAuthority,
    controllerAuthorityBump,
    roleId1,
    roleId2,
    roleId3,
    userRole1,
    userRole2,
    userRole3,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
