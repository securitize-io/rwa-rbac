import { AnchorProvider, Wallet, BN, getProvider } from '@anchor-lang/core';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  SYSVAR_CLOCK_PUBKEY,
  ConfirmOptions,
  Signer,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import * as multisig from '@sqds/multisig';
import {
  AdminFlags,
  MediciFlags,
  RwaRbacClient,
  deriveControllerAuthorityPda,
  deriveAssetAccessControllerPda,
  deriveUserRolePda,
  RBAC_PROGRAM,
  GateAuthorityProof,
} from '../client/src';
import { Config } from '@dstoken-solana/rwa-token-sdk';
import { readFileSync } from 'fs';

export type TestGate = { authority: PublicKey; account: PublicKey; vaultIndex: number };

/** Squads-specific proof construction belongs in the caller, not the RBAC program. */
export function gateAuthorityProof(gate: TestGate): GateAuthorityProof {
  const [, bump] = multisig.getVaultPda({ multisigPda: gate.account, index: gate.vaultIndex });
  return {
    programId: multisig.PROGRAM_ID,
    seeds: [
      Buffer.from('multisig'),
      gate.account.toBuffer(),
      Buffer.from('vault'),
      Buffer.from([gate.vaultIndex]),
      Buffer.from([bump]),
    ],
  };
}

const offlineKeys = new Set<string>();
/** Generated test addresses must not trigger pointless devnet lookups while forking Squads. */
async function offlineAccounts(connection: Connection, addresses: PublicKey[]) {
  const fresh = [...new Map(addresses.map((key) => [key.toBase58(), key])).values()].filter(
    (key) => !offlineKeys.has(key.toBase58())
  );
  await Promise.all(
    fresh.map(async (key) => {
      const result = await connection['_rpcRequest']('surfnet_offlineAccount', [
        key.toBase58(),
        { includeOwnedAccounts: false },
      ]);
      if (result.error) throw new Error(JSON.stringify(result.error));
      offlineKeys.add(key.toBase58());
    })
  );
}

async function confirmTransaction(connection: Connection, signature: string) {
  // Use HTTP status checks for local tests: a fast Surfpool confirmation can
  // precede web3.js's WebSocket subscription and otherwise incur a 10s fallback.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const {
      value: [status],
    } = await connection.getSignatureStatuses([signature]);
    if (status?.err) throw new Error(`Transaction ${signature} failed: ${JSON.stringify(status.err)}`);
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return;
    await sleep(50);
  }
  throw new Error(`Timed out confirming ${signature}`);
}

export async function sendTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Signer[],
  options?: ConfirmOptions
) {
  await offlineAccounts(
    connection,
    transaction.instructions.flatMap((ix) => ix.keys.map((key) => key.pubkey))
  );
  // Do not reuse web3.js's cached blockhash: fast local transactions and time
  // travel can age it out before the cache's wall-clock timeout expires.
  transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  transaction.feePayer ??= signers[0].publicKey;
  transaction.sign(...signers);
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    ...options,
    preflightCommitment: options?.preflightCommitment ?? 'confirmed',
  });
  await confirmTransaction(connection, signature);
  return signature;
}

export async function createTestSquadsMultisig({
  connection,
  creator,
  members,
  timeLock,
  vaultIndex = 0,
}: {
  connection: Connection;
  creator: Keypair;
  members: PublicKey[];
  timeLock: number;
  vaultIndex?: number;
}) {
  const createKey = Keypair.generate();
  const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: vaultIndex });
  await offlineAccounts(connection, [createKey.publicKey, multisigPda, vaultPda]);
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

  return { multisigPda, vaultPda, gate: { authority: vaultPda, account: multisigPda, vaultIndex } as TestGate };
}

export async function createAndApproveSquadsVaultTransaction({
  connection,
  multisigPda,
  vaultPda,
  member,
  feePayer,
  instruction,
  vaultIndex = 0,
}: {
  connection: Connection;
  multisigPda: PublicKey;
  vaultPda: PublicKey;
  member: Keypair;
  feePayer: Keypair;
  instruction: TransactionInstruction | TransactionInstruction[];
  vaultIndex?: number;
}) {
  const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
  const transactionIndex = BigInt(multisigAccount.transactionIndex.toString()) + BigInt(1);
  const ixs = Array.isArray(instruction) ? instruction : [instruction];
  await offlineAccounts(connection, [
    multisig.getTransactionPda({ multisigPda, index: transactionIndex })[0],
    multisig.getProposalPda({ multisigPda, transactionIndex })[0],
    ...ixs.flatMap((ix) => ix.keys.map((key) => key.pubkey)),
  ]);

  const transactionMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: ixs,
  });

  const createSignature = await multisig.rpc.vaultTransactionCreate({
    connection,
    feePayer,
    multisigPda,
    transactionIndex,
    creator: member.publicKey,
    vaultIndex,
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
  // Block timestamps can lag the clock after repeated time travel. Use the same
  // sysvar that on-chain authorities read, including when block production is paused.
  const clock = await connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY, 'confirmed');
  if (!clock) throw new Error('Surfpool did not return the clock sysvar');
  const blockTime = Number(clock.data.readBigInt64LE(32));

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

  const connectionUrl = process.env.RPC_URL ?? process.env.ANCHOR_PROVIDER_URL ?? 'http://localhost:8899';
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

  const { gate } = await createTestSquadsMultisig({
    connection,
    creator: signer1Kp,
    members: [signer1Kp.publicKey],
    timeLock: 0,
  });
  return {
    gate,
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

/** Surfpool state injection for malformed accounts and isolated RBAC fixtures. */
export async function setAccount(
  connection: Connection,
  address: PublicKey,
  update: {
    data?: Buffer;
    owner?: PublicKey;
    lamports?: number;
  }
) {
  const result = await connection['_rpcRequest']('surfnet_setAccount', [
    address.toBase58(),
    {
      ...update,
      data: update.data?.toString('hex'),
      owner: update.owner?.toBase58(),
    },
  ]);
  if (result.error) throw new Error(JSON.stringify(result.error));
}

export async function expectFailure(task: Promise<unknown>, expected: string) {
  try {
    await task;
  } catch (error) {
    const message = `${String(error)}\n${(error as any).logs?.join('\n') ?? ''}`;
    if (!message.includes(expected)) throw new Error(`Expected ${expected}, received ${message}`);
    return;
  }
  throw new Error(`Expected failure: ${expected}`);
}

/** Create/approve an actual Squads request. The signer is still subject to RBAC. */
export async function propose(
  connection: Connection,
  gate: TestGate,
  member: Keypair,
  instruction: TransactionInstruction | TransactionInstruction[],
  feePayer = member
) {
  return createAndApproveSquadsVaultTransaction({
    connection,
    multisigPda: gate.account,
    vaultPda: gate.authority,
    member,
    feePayer,
    instruction,
    vaultIndex: gate.vaultIndex ?? 0,
  });
}

export async function execute(
  connection: Connection,
  gate: TestGate,
  member: Keypair,
  transactionIndex: bigint,
  feePayer = member
) {
  return executeSquadsVaultTransaction({ connection, multisigPda: gate.account, transactionIndex, member, feePayer });
}

export async function sendGated(
  connection: Connection,
  gate: TestGate,
  member: Keypair,
  instruction: TransactionInstruction | TransactionInstruction[],
  feePayer = member
) {
  const index = await propose(connection, gate, member, instruction, feePayer);
  return execute(connection, gate, member, index, feePayer);
}

export async function createGateContext(timeLock = 0, vaultIndex = 0, admin = Keypair.generate()) {
  const connection = new Connection(getProvider().connection.rpcEndpoint, 'confirmed');
  await setAccount(connection, admin.publicKey, {
    owner: SystemProgram.programId,
    data: Buffer.alloc(0),
    lamports: 100 * LAMPORTS_PER_SOL,
  });
  const { gate } = await createTestSquadsMultisig({
    connection,
    creator: admin,
    members: [admin.publicKey],
    timeLock,
    vaultIndex,
  });
  const provider = new AnchorProvider(connection as any, new Wallet(admin as any), { commitment: 'confirmed' });
  const client = new RwaRbacClient({ connection, rpcUrl: connection.rpcEndpoint } as any, provider);
  return { connection, admin, gate, client };
}

export async function fixture(
  context: Awaited<ReturnType<typeof createGateContext>>,
  bootstrap = true,
  liveAsset = false
) {
  const { connection, client, admin, gate } = context;
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const controller = deriveAssetAccessControllerPda(mint);
  const controllerAuthority = deriveControllerAuthorityPda(controller);
  const [, bump] = PublicKey.findProgramAddressSync([controller.toBuffer()], RBAC_PROGRAM);
  const master = deriveUserRolePda(new BN(1), controller);
  const child = deriveUserRolePda(new BN(2), controller);
  const outsider = Keypair.generate();
  await setAccount(connection, outsider.publicKey, {
    owner: SystemProgram.programId,
    data: Buffer.alloc(0),
    lamports: LAMPORTS_PER_SOL,
  });
  const data = await client.rbacProgram.coder.accounts.encode('assetAccessController', {
    controllerAuthority,
    controllerAuthorityBump: bump,
    admin: admin.publicKey,
    assetMint: mint,
    userRolesCount: new BN(0),
    hasMasterRole: false,
    lutAddress: SystemProgram.programId,
  });
  if (liveAsset) {
    const create = await client.createAssetAccessControllerIxn({
      payer: admin.publicKey,
      admin: admin.publicKey,
      assetMint: mint,
      decimals: 2,
      name: 'Governed asset',
      uri: 'https://example.com/asset',
      symbol: 'GATE',
    });
    await sendTransaction(
      connection,
      new Transaction().add(
        require('@solana/web3.js').ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        create
      ),
      [admin, mintKeypair]
    );
  } else {
    await setAccount(connection, controller, { owner: RBAC_PROGRAM, data, lamports: 10_000_000 });
  }
  const f = { ...context, mint, controller, controllerAuthority, master, child, outsider };
  if (bootstrap) {
    await sendGated(
      connection,
      gate,
      admin,
      await client.createUserRoleIxn({
        ...adminArgs(f),
        name: 'Governance',
        allowedAdminIxs: AdminFlags.ALL,
        allowedMediciIxs: MediciFlags.ALL,
        isMasterRole: true,
        newGateAuthority: gate.authority,
        newGateAuthorityProof: gateAuthorityProof(gate),
        authorizedUserRole: undefined,
      })
    );
  }
  return f;
}

export function adminArgs(f: Awaited<ReturnType<typeof fixture>>) {
  return {
    payer: f.admin.publicKey,
    user: f.admin.publicKey,
    assetAccessController: f.controller,
    authorizedUserRole: f.master,
    gateAuthority: f.gate.authority,
  };
}

export async function storeRole(
  f: Awaited<ReturnType<typeof fixture>>,
  changes: Record<string, unknown>,
  address = f.master
) {
  const previous = await f.client.rbacProgram.account.userRole.fetch(address);
  const role = { ...previous, ...changes };
  const data = await f.client.rbacProgram.coder.accounts.encode('userRole', role);
  const allocation = Buffer.alloc(171 + role.users.length * 32);
  data.copy(allocation);
  await setAccount(f.connection, address, { owner: RBAC_PROGRAM, data: allocation, lamports: 10_000_000 });
}
