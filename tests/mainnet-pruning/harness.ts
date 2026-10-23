import { AnchorProvider, BN, Wallet } from '@coral-xyz/anchor';
import {
  Connection,
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import * as sdk from '@dstoken-solana/rwa-token-sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { RwaRbacClient, RBAC_PROGRAM } from '../../client/src';
import { output, rpc } from './inspect';

export const localUrl = process.env.SURFPOOL_RPC_URL || 'http://127.0.0.1:18899';
export const local = (method: string, params: unknown[] = []) => rpc(method, params, localUrl);
export const load = (name: string) => JSON.parse(readFileSync(join(output, name), 'utf8'));
export const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
export class Harness {
  manifest = load('manifest.json');
  accounts = load('fork-accounts.json');
  connection = new Connection(localUrl, 'confirmed');
  payer = Keypair.fromSeed(Buffer.alloc(32, 23));
  provider = new AnchorProvider(this.connection, new Wallet(this.payer), { commitment: 'confirmed' });
  client = new RwaRbacClient(
    { connection: this.connection, rpcUrl: localUrl, confirmationOptions: { commitment: 'confirmed' } },
    this.provider
  );

  async setAccount(address: string, account: any) {
    if (!account) return;
    await local('surfnet_setAccount', [
      address,
      {
        data: Buffer.from(account.data[0], 'base64').toString('hex'),
        owner: account.owner,
        lamports: account.lamports,
        executable: account.executable,
      },
    ]);
  }
  async install(program: PublicKey, binary: Buffer) {
    await local('surfnet_writeProgram', [program.toBase58(), binary.toString('hex'), 0]);
    return hash(binary);
  }
  mainnetBinary(program: string) {
    const programAccount = this.accounts[program];
    const dataAddress = new PublicKey(Buffer.from(programAccount.data[0], 'base64').subarray(4, 36)).toBase58();
    return Buffer.from(this.accounts[dataAddress].data[0], 'base64').subarray(45);
  }
  async reset() {
    for (const [address, account] of Object.entries<any>(this.accounts)) {
      if (!account || account.executable || account.owner === 'BPFLoaderUpgradeab1e11111111111111111111111') continue;
      await this.setAccount(address, account);
    }
    await local('surfnet_setAccount', [this.payer.publicKey.toBase58(), { lamports: 10000000000 }]);
  }
  async installMainnet() {
    const hashes: Record<string, string> = {};
    for (const id of this.manifest.programs) {
      if (this.accounts[id]) hashes[id] = await this.install(new PublicKey(id), this.mainnetBinary(id));
    }
    return hashes;
  }
  async installCandidate() {
    return {
      policyEngine: await this.install(
        sdk.policyEngineProgramId,
        readFileSync(join(__dirname, '../../deps/policy_engine.so'))
      ),
      rbac: await this.install(RBAC_PROGRAM, readFileSync(join(output, 'build/rwa_rbac.so'))),
    };
  }
  async transfer() {
    const { source, destination, mint } = this.manifest;
    // Use the actual token accounts, including non-ATAs, from the mainnet fixture.
    // SDK supplies the complete TransferHook remaining-account list.
    const ixs = await sdk.getTransferTokensIxs(
      {
        assetMint: mint,
        from: source.owner,
        wallet: source.wallet,
        to: destination.wallet,
        amount: new BN(1),
        decimals: 6,
      },
      this.provider
    );
    const ix = ixs[ixs.length - 1];
    ix.keys[0].pubkey = new PublicKey(source.tokenAccount);
    ix.keys[2].pubkey = new PublicKey(destination.tokenAccount);
    return this.transaction([ix]);
  }
  async prune() {
    const { mint, source, controller, role, pruningUser } = this.manifest;
    return this.transaction([
      await this.client.policyEngine.pruneIssuances(
        { assetMint: mint, owner: source.owner },
        new PublicKey(pruningUser),
        new PublicKey(controller),
        new PublicKey(role)
      ),
    ]);
  }
  async transaction(instructions: TransactionInstruction[]) {
    const { blockhash } = await this.connection.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: this.payer.publicKey,
      recentBlockhash: blockhash,
      instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }), ...instructions],
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    tx.sign([this.payer]);
    return tx;
  }
  async simulate(tx: VersionedTransaction) {
    return (await this.connection.simulateTransaction(tx, { sigVerify: false, commitment: 'confirmed' })).value;
  }
  async submit(tx: VersionedTransaction) {
    const signature = await this.connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
    for (let i = 0; i < 100; i++) {
      const status = (await this.connection.getSignatureStatuses([signature])).value[0];
      if (
        status &&
        (status.err || status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')
      ) {
        const transaction = await this.connection.getTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });
        if (transaction?.meta) return { signature, meta: transaction.meta };
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Transaction ${signature} did not confirm`);
  }
  async execute(tx: VersionedTransaction) {
    const result = await this.submit(tx);
    if (result.meta.err)
      throw new Error(
        `Transaction ${result.signature} failed: ${JSON.stringify(result.meta.err)}\n${result.meta.logMessages?.join(
          '\n'
        )}`
      );
    return result.signature;
  }
  async clock() {
    const clock = await this.connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY);
    return Number(clock!.data.readBigInt64LE(32));
  }
  async tracker() {
    return sdk.getTrackerAccount(this.manifest.mint, this.manifest.source.owner, this.provider);
  }
  async snapshot() {
    const { source, destination, mint } = this.manifest;
    const addresses = [
      source.tracker,
      destination.tracker,
      source.tokenAccount,
      destination.tokenAccount,
      mint,
      sdk.getPolicyEnginePda(mint).toBase58(),
      sdk.getIdentityRegistryPda(mint).toBase58(),
      source.identity,
      destination.identity,
    ];
    const accounts = await this.connection.getMultipleAccountsInfo(addresses.map((a) => new PublicKey(a)));
    return Object.fromEntries(
      addresses.map((a, i) => [
        a,
        {
          data: accounts[i]!.data.toString('base64'),
          lamports: accounts[i]!.lamports,
          owner: accounts[i]!.owner.toBase58(),
        },
      ])
    );
  }
}
