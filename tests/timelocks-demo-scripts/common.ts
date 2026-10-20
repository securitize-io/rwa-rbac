import * as anchor from '@anchor-lang/core';
import { Config } from '@dstoken-solana/rwa-token-sdk';
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { RwaRbacClient } from '../../client/src';

export {
  advanceSurfpoolClock as advanceClock,
  createAndApproveSquadsVaultTransaction as createAndApproveProposal,
  createTestSquadsMultisig as createSquads,
  executeSquadsVaultTransaction as executeProposal,
} from '../utils';

const STATE_PATH = join(__dirname, '.timelock-demo-state.json');
const TEST_SIGNER_PATH = join(__dirname, '..', 'testSigner.json');

export type DemoState = {
  adminSecret: number[];
  memberSecret: number[];
  assetMintSecret: number[];
  lutAddress: string;
  timeLock: number;
  assetAccessController?: string;
  userRole?: string;
  multisig?: string;
  vault?: string;
  transactionIndex?: string;
};

export function run(task: () => Promise<void>): void {
  task().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export function initializeState(): DemoState {
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(TEST_SIGNER_PATH, 'utf8'))));
  const member = Keypair.generate();
  const assetMint = Keypair.generate();
  const state: DemoState = {
    adminSecret: Array.from(admin.secretKey),
    memberSecret: Array.from(member.secretKey),
    assetMintSecret: Array.from(assetMint.secretKey),
    lutAddress: Keypair.generate().publicKey.toBase58(),
    timeLock: Number(process.env.TIMELOCK_SECONDS ?? 60),
  };
  saveState(state);
  return state;
}

export function loadState(): DemoState {
  if (!existsSync(STATE_PATH)) {
    throw new Error('Demo state is missing. Run 00-initialize.ts first.');
  }
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}

export function saveState(state: DemoState): void {
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

export function keypair(secret: number[]): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export function requireAddress(state: DemoState, field: keyof DemoState): PublicKey {
  const value = state[field];
  if (typeof value !== 'string') {
    throw new Error(`State field ${field} is missing. Run the preceding scripts first.`);
  }
  return new PublicKey(value);
}

export function context(state = loadState()) {
  const admin = keypair(state.adminSecret);
  const member = keypair(state.memberSecret);
  const assetMint = keypair(state.assetMintSecret);
  const rpcUrl = process.env.RPC_URL ?? process.env.ANCHOR_PROVIDER_URL ?? 'http://127.0.0.1:8899';
  const connection = new Connection(rpcUrl, 'confirmed');
  // Anchor and the root client resolve separate declarations of the same web3.js types.
  const provider = new anchor.AnchorProvider(connection as any, new anchor.Wallet(admin as any), {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  const config: Config = {
    connection,
    rpcUrl,
    confirmationOptions: { commitment: 'confirmed', maxRetries: 3, skipPreflight: false },
  };
  return {
    state,
    admin,
    member,
    assetMint,
    connection,
    client: new RwaRbacClient(config as any, provider as any),
  };
}

export async function confirm(connection: Connection, signature: string): Promise<void> {
  const result = await connection.confirmTransaction(signature, 'confirmed');
  if (result.value.err) throw new Error(`Transaction ${signature} failed: ${JSON.stringify(result.value.err)}`);
}

export async function fund(connection: Connection, publicKey: PublicKey, lamports = 2_000_000_000): Promise<void> {
  const balance = await connection.getBalance(publicKey, 'confirmed');
  if (balance >= lamports / 2) return;
  await confirm(connection, await connection.requestAirdrop(publicKey, lamports));
}

export async function send(connection: Connection, instructions: TransactionInstruction[], signers: Keypair[]) {
  return sendAndConfirmTransaction(connection, new Transaction().add(...instructions), signers, {
    commitment: 'confirmed',
  });
}

export function print(label: string, value: unknown): void {
  console.log(`\n${label}\n${JSON.stringify(normalize(value), null, 2)}`);
}

function normalize(value: any): any {
  if (value && typeof value.toBase58 === 'function') return value.toBase58();
  if (anchor.BN.isBN(value)) return value.toString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}
