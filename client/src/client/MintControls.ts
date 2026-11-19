import { BN, IdlAccounts, IdlTypes, Program } from '@anchor-lang/core';
import { Keypair, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  RwaClient,
  assetControllerProgramId,
  getAssetControllerEventAuthority,
  getAssetControllerPda,
  getIdentityRegistryPda,
  getWalletIdentityAccount,
  getWalletIdentityAccountPda,
  getPolicyEnginePda,
  policyEngineProgramId,
} from '@dstoken-solana/rwa-token-sdk';
import { RwaRbac } from '../types/generated/rwa_rbac';
import { AssetController } from '../types/generated/asset_controller';
import * as tokenIdl from '../types/generated/asset_controller.json';
import { deriveControllerAuthorityPda } from '../pdas';

export type LegacyTokenAssetControllerAccount = { version: 1; assetMint: PublicKey; authority: PublicKey };
export type TokenAssetControllerAccountV2 = Omit<IdlAccounts<AssetController>['assetControllerAccount'], 'version'> & {
  version: 2;
};
/** Narrow by version before accessing caps, throttle, or consumption fields. */
export type TokenAssetControllerAccount = LegacyTokenAssetControllerAccount | TokenAssetControllerAccountV2;
export type TokenPendingOperation = IdlAccounts<AssetController>['pendingOperation'];
export type CapsConfig = IdlTypes<AssetController>['capsConfig'];
export type ThrottleConfig = IdlTypes<AssetController>['throttleConfig'];
export type MintRequest = IdlTypes<AssetController>['mintRequest'];
export type BurnRequest = IdlTypes<AssetController>['burnRequest'];
export type MintControlsAuthorization = {
  assetMint: PublicKey;
  user: PublicKey;
  assetAccessController: PublicKey;
  authorizedUserRole: PublicKey;
};
export type MintControlsGovernance = MintControlsAuthorization & { gateAuthority?: PublicKey };
export type ProposeMintArgs = MintControlsAuthorization & { payer: PublicKey; wallet: PublicKey; request: MintRequest };
export type ProposeBurnArgs = Omit<ProposeMintArgs, 'request'> & { request: BurnRequest; tokenAccount?: PublicKey };
export type PendingOperationArgs = MintControlsAuthorization & { operationId: Uint8Array };

/** Persist this ID before submitting; terminal events, rather than account existence, identify completed requests. */
export const generateOperationId = (): Uint8Array => Keypair.generate().publicKey.toBytes();
function bytes32(id: Uint8Array | number[]): Buffer {
  if (id.length !== 32 || !Array.from(id).every((b) => Number.isInteger(b) && b >= 0 && b <= 255))
    throw new Error('Expected exactly 32 bytes for operation ID');
  return Buffer.from(id);
}
export const getPendingOperationPda = (mint: PublicKey, id: Uint8Array | number[]): PublicKey =>
  PublicKey.findProgramAddressSync(
    [Buffer.from('pending_operation'), mint.toBuffer(), bytes32(id)],
    assetControllerProgramId
  )[0];

/** Supply-control authorization uses RBAC; limits, pending state and time checks live in the token program. */
export class MintControls {
  readonly tokenProgram: Program<AssetController>;
  constructor(private readonly rwaClient: RwaClient, private readonly rbacProgram: Program<RwaRbac>) {
    this.tokenProgram = new Program(tokenIdl as AssetController, rwaClient.provider);
  }

  private accounts(args: MintControlsAuthorization) {
    return {
      user: args.user,
      controllerAuthority: deriveControllerAuthorityPda(args.assetAccessController),
      assetAccessController: args.assetAccessController,
      authorizedUserRole: args.authorizedUserRole,
      assetMint: args.assetMint,
      assetController: getAssetControllerPda(args.assetMint.toBase58()),
      assetControllerProgram: assetControllerProgramId,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      eventAuthority: getAssetControllerEventAuthority(),
    };
  }

  setCapsConfigIx(args: MintControlsGovernance & { caps: CapsConfig }): Promise<TransactionInstruction> {
    return this.rbacProgram.methods
      .setCapsConfig(this.tokenProgram.coder.instruction.encode('setCapsConfig', { caps: args.caps }))
      .accountsStrict({
        ...this.accounts(args),
        gateAuthority: args.gateAuthority ?? null,
      })
      .instruction();
  }

  setThrottleConfigIx(args: MintControlsGovernance & { throttle: ThrottleConfig }): Promise<TransactionInstruction> {
    return this.rbacProgram.methods
      .setThrottleConfig(this.tokenProgram.coder.instruction.encode('setThrottleConfig', { throttle: args.throttle }))
      .accountsStrict({
        ...this.accounts(args),
        gateAuthority: args.gateAuthority ?? null,
      })
      .instruction();
  }

  migrateAssetControllerIx(args: MintControlsGovernance & { payer: PublicKey }): Promise<TransactionInstruction> {
    return this.rbacProgram.methods
      .migrateAssetController()
      .accountsStrict({
        ...this.accounts(args),
        gateAuthority: args.gateAuthority ?? null,
        payer: args.payer,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /** Read either deployed layout; allocation padding does not determine the version. */
  async getAssetController(assetMint: PublicKey): Promise<TokenAssetControllerAccount> {
    const info = await this.rwaClient.provider.connection.getAccountInfo(getAssetControllerPda(assetMint.toBase58()));
    const discriminator = this.tokenProgram.idl.accounts!.find(
      (a) => a.name === 'assetControllerAccount'
    )!.discriminator;
    if (
      !info ||
      !info.owner.equals(assetControllerProgramId) ||
      !info.data.subarray(0, discriminator.length).equals(Buffer.from(discriminator))
    )
      throw new Error('Invalid token asset controller owner or discriminator');
    const { data } = info;
    let account: TokenAssetControllerAccount;
    if (data[8] === 1 && data.length >= 73) {
      account = {
        version: 1,
        assetMint: new PublicKey(data.subarray(9, 41)),
        authority: new PublicKey(data.subarray(41, 73)),
      };
    } else if (data[8] === 2 && data.length >= this.tokenProgram.account.assetControllerAccount.size) {
      account = this.tokenProgram.coder.accounts.decode<TokenAssetControllerAccountV2>('assetControllerAccount', data);
    } else {
      throw new Error('Unsupported token asset controller version or invalid account length');
    }
    if (!account.assetMint.equals(assetMint)) throw new Error('Token asset controller mint mismatch');
    return account;
  }

  getPendingOperation(assetMint: PublicKey, operationId: Uint8Array): Promise<TokenPendingOperation | null> {
    return this.tokenProgram.account.pendingOperation.fetchNullable(getPendingOperationPda(assetMint, operationId));
  }

  getPendingOperations(assetMint: PublicKey): Promise<{ publicKey: PublicKey; account: TokenPendingOperation }[]> {
    return this.tokenProgram.account.pendingOperation.all([{ memcmp: { offset: 8, bytes: assetMint.toBase58() } }]);
  }

  private async pending(args: { assetMint: PublicKey; operationId: Uint8Array }) {
    const pending = await this.getPendingOperation(args.assetMint, args.operationId);
    if (!pending) throw new Error('Pending operation does not exist; check terminal events before retrying');
    return pending;
  }

  private async proposalAccounts(args: ProposeMintArgs | ProposeBurnArgs) {
    const mint = args.assetMint.toBase58();
    const walletIdentityAccount = getWalletIdentityAccountPda(mint, args.wallet.toBase58());
    const link = await getWalletIdentityAccount(walletIdentityAccount, this.rwaClient.provider);
    if (!link) throw new Error('Wallet is not registered for this asset');
    return {
      ...this.accounts(args),
      payer: args.payer,
      wallet: args.wallet,
      tokenAccount:
        'tokenAccount' in args && args.tokenAccount
          ? args.tokenAccount
          : getAssociatedTokenAddressSync(args.assetMint, args.wallet, true, TOKEN_2022_PROGRAM_ID),
      identityRegistry: getIdentityRegistryPda(mint),
      identityAccount: link.identityAccount,
      walletIdentityAccount,
      pendingOperation: getPendingOperationPda(args.assetMint, args.request.id),
      systemProgram: SystemProgram.programId,
    };
  }

  async proposeMintIx(args: ProposeMintArgs): Promise<TransactionInstruction> {
    bytes32(args.request.id);
    return this.rbacProgram.methods
      .proposeMint(this.tokenProgram.coder.instruction.encode('proposeMint', { request: args.request }))
      .accountsStrict(await this.proposalAccounts(args))
      .instruction();
  }

  async proposeBurnIx(args: ProposeBurnArgs): Promise<TransactionInstruction> {
    bytes32(args.request.id);
    if (Buffer.byteLength(args.request.reason, 'utf8') > 256) throw new Error('Burn reason exceeds 256 UTF-8 bytes');
    return this.rbacProgram.methods
      .proposeBurn(this.tokenProgram.coder.instruction.encode('proposeBurn', { request: args.request }))
      .accountsStrict(await this.proposalAccounts(args))
      .instruction();
  }

  /** Prepares a mint ATA idempotently. Burns never create token accounts. */
  async executePendingIxs(args: PendingOperationArgs & { payer: PublicKey }): Promise<TransactionInstruction[]> {
    const pending = await this.pending(args);
    const mint = args.assetMint.toBase58();
    const ix = await this.rbacProgram.methods
      .executePending()
      .accountsStrict({
        ...this.accounts(args),
        payer: args.payer,
        wallet: pending.wallet,
        tokenAccount: pending.tokenAccount,
        identityRegistry: getIdentityRegistryPda(mint),
        identityAccount: pending.identityAccount,
        trackerAccount: PublicKey.findProgramAddressSync(
          [args.assetMint.toBuffer(), pending.identityAccount.toBuffer()],
          policyEngineProgramId
        )[0],
        policyEngine: getPolicyEnginePda(mint),
        policyEngineProgram: policyEngineProgramId,
        walletIdentityAccount: getWalletIdentityAccountPda(mint, pending.wallet.toBase58()),
        rentPayer: pending.rentPayer,
        pendingOperation: getPendingOperationPda(args.assetMint, args.operationId),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    return 'mint' in pending.data
      ? [
          createAssociatedTokenAccountIdempotentInstruction(
            args.payer,
            pending.tokenAccount,
            pending.wallet,
            args.assetMint,
            TOKEN_2022_PROGRAM_ID
          ),
          ix,
        ]
      : [ix];
  }

  async cancelPendingIx(args: PendingOperationArgs): Promise<TransactionInstruction> {
    const pending = await this.pending(args);
    return this.rbacProgram.methods
      .cancelPending()
      .accountsStrict({
        ...this.accounts(args),
        rentPayer: pending.rentPayer,
        pendingOperation: getPendingOperationPda(args.assetMint, args.operationId),
      })
      .instruction();
  }

  /** Permissionless cleanup calls the token program directly and always refunds the recorded payer. */
  async expirePendingIx(args: { assetMint: PublicKey; operationId: Uint8Array }): Promise<TransactionInstruction> {
    const pending = await this.pending(args);
    return this.tokenProgram.methods
      .expirePending()
      .accountsStrict({
        pendingOperation: getPendingOperationPda(args.assetMint, args.operationId),
        rentPayer: pending.rentPayer,
        eventAuthority: getAssetControllerEventAuthority(),
        program: assetControllerProgramId,
      })
      .instruction();
  }

  /** Plan migration and configuration together. Submit each returned asset batch atomically. */
  async migrateAndConfigureIxs(
    args: MintControlsGovernance & {
      payer: PublicKey;
      caps: CapsConfig;
      throttle: ThrottleConfig;
    }
  ): Promise<TransactionInstruction[]> {
    const controller = await this.getAssetController(args.assetMint);
    const current = controller.version === 2 ? controller : null;
    const equal = <T extends object>(a: T, b: T): boolean =>
      Object.keys(a).every((key) => {
        const left = a[key as keyof T],
          right = b[key as keyof T];
        return BN.isBN(left) && BN.isBN(right) ? left.eq(right) : left === right;
      });
    const ixs: TransactionInstruction[] = controller.version === 1 ? [await this.migrateAssetControllerIx(args)] : [];
    // Migrated accounts start at zero/default; avoid the token program's unchanged-config rejection.
    const zero = new BN(0);
    const caps = current?.caps ?? { maxMintPerTx: zero, maxBurnPerTx: zero };
    if (!equal(caps, args.caps)) ixs.push(await this.setCapsConfigIx(args));
    const throttle = current?.throttle ?? {
      enabled: false,
      mintWindowCap: zero,
      burnWindowCap: zero,
      windowSeconds: zero,
      largeAmountThreshold: zero,
      largeAmountDelay: zero,
      pendingOperationGracePeriod: zero,
    };
    if (!equal(throttle, args.throttle)) ixs.push(await this.setThrottleConfigIx(args));
    return ixs;
  }
}
