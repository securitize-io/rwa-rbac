import { PublicKey } from '@solana/web3.js';
import * as sdk from '@dstoken-solana/rwa-token-sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  deriveAssetAccessControllerPda,
  deriveControllerAuthorityPda,
  deriveUserRolePda,
  RBAC_PROGRAM,
  IMR_PROGRAM,
} from '../../client/src';
import { BN } from '@coral-xyz/anchor';
import { decode, MINT, output, rpc, save } from './inspect';
import rbacIdl from '../../client/src/types/generated/rwa_rbac.json';

export async function prepare() {
  const investors = JSON.parse(readFileSync(join(output, 'investors.json'), 'utf8'));
  const source = investors
    .filter((i: any) => BigInt(`0x${i.trackerState.total_amount}`) > 0n)
    .sort((a: any, b: any) => b.issuanceCount - a.issuanceCount)[0];
  // The existing platform identity adds no second investor's issuance history.
  const destination = investors.find((i: any) => i.identityState.levels.some((l: any) => l.level === 30));
  if (!source || !destination) throw new Error('No affected investor/platform identity found');
  const wallets: any[] = [];
  for (const identity of [source, destination]) {
    const mappings = await rpc('getProgramAccounts', [
      sdk.identityRegistryProgramId.toBase58(),
      {
        encoding: 'base64',
        filters: [{ dataSize: 72 }, { memcmp: { offset: 8, bytes: identity.identity } }],
      },
    ]);
    wallets.push(
      ...mappings.map((a: any) => ({ ...a, decoded: decode(sdk.IdentityRegistryIdl, 'WalletIdentity', a.account) }))
    );
  }
  save('wallets.json', wallets);
  const sourceWallets = wallets.filter((w) => w.decoded.identity_account.toBase58() === source.identity);
  const destinationWallets = wallets.filter((w) => w.decoded.identity_account.toBase58() === destination.identity);
  const tokenAccounts: any[] = [];
  for (const wallet of [...sourceWallets, ...destinationWallets]) {
    const result = await rpc('getTokenAccountsByOwner', [
      wallet.decoded.wallet.toBase58(),
      { mint: MINT },
      { encoding: 'base64' },
    ]);
    tokenAccounts.push(...result.value.map((a: any) => ({ ...a, wallet: wallet.decoded.wallet.toBase58() })));
  }
  save('token-accounts.json', tokenAccounts);
  const sourceToken = tokenAccounts
    .filter((a) => sourceWallets.some((w) => w.decoded.wallet.toBase58() === a.wallet))
    .sort((a, b) =>
      Number(
        Buffer.from(b.account.data[0], 'base64').readBigUInt64LE(64) -
          Buffer.from(a.account.data[0], 'base64').readBigUInt64LE(64)
      )
    )[0];
  const destinationToken = tokenAccounts.find((a) =>
    destinationWallets.some((w) => w.decoded.wallet.toBase58() === a.wallet)
  );
  if (!sourceToken || !destinationToken) throw new Error('Missing source or platform token account');
  const controller = deriveAssetAccessControllerPda(new PublicKey(MINT));
  const keys = [
    MINT,
    source.identity,
    source.tracker,
    destination.identity,
    destination.tracker,
    sourceToken.pubkey,
    destinationToken.pubkey,
    sourceToken.wallet,
    destinationToken.wallet,
    sdk.getWalletIdentityAccountPda(MINT, sourceToken.wallet).toBase58(),
    sdk.getWalletIdentityAccountPda(MINT, destinationToken.wallet).toBase58(),
    sdk.getIdentityRegistryPda(MINT).toBase58(),
    sdk.getPolicyEnginePda(MINT).toBase58(),
    sdk.getExtraMetasListPda(MINT).toBase58(),
    sdk.getAssetControllerPda(MINT).toBase58(),
    controller.toBase58(),
    deriveControllerAuthorityPda(controller).toBase58(),
  ];
  const accounts: Record<string, any> = {};
  const fetchAccounts = async (addresses: string[]) => {
    const result = await rpc('getMultipleAccounts', [addresses, { encoding: 'base64' }]);
    addresses.forEach((address, i) => {
      accounts[address] = result.value[i];
    });
    return result.context.slot;
  };
  const slot = await fetchAccounts(keys);
  const controllerState =
    accounts[controller.toBase58()] && decode(rbacIdl, 'AssetAccessController', accounts[controller.toBase58()]);
  if (!controllerState) throw new Error('Derived RBAC controller missing');
  const roleKeys = Array.from({ length: controllerState.user_roles_count.toNumber() }, (_, i) =>
    deriveUserRolePda(new BN(i + 1), controller).toBase58()
  );
  await fetchAccounts(roleKeys);
  const roles = roleKeys
    .filter((key) => accounts[key])
    .map((key) => ({ address: key, state: decode(rbacIdl, 'UserRole', accounts[key]) }));
  const role = roles.find((r) => r.state.allowed_medici_ixs.testn(3) && r.state.users.length);
  if (!role) throw new Error('No assigned ISSUE_TOKENS role');
  const programs = [
    sdk.assetControllerProgramId,
    sdk.policyEngineProgramId,
    sdk.identityRegistryProgramId,
    RBAC_PROGRAM,
    IMR_PROGRAM,
  ].map((p) => p.toBase58());
  await fetchAccounts(programs);
  const programDataKeys = programs
    .filter((p) => accounts[p])
    .map((p) => new PublicKey(Buffer.from(accounts[p].data[0], 'base64').subarray(4, 36)).toBase58());
  await fetchAccounts(programDataKeys);
  await fetchAccounts([role.state.users[0].toBase58()]);
  const manifest = {
    mint: MINT,
    slot,
    capturedAt: new Date().toISOString(),
    source: { ...source, wallet: sourceToken.wallet, tokenAccount: sourceToken.pubkey },
    destination: { ...destination, wallet: destinationToken.wallet, tokenAccount: destinationToken.pubkey },
    controller: controller.toBase58(),
    role: role.address,
    pruningUser: role.state.users[0].toBase58(),
    investorCount: investors.filter((i: any) => BigInt(`0x${i.trackerState.total_amount}`) > 0n).length,
    registeredInvestorCount: investors.filter((i: any) => i.identityState.levels.some((l: any) => l.level === 1))
      .length,
    identityCount: investors.length,
    programs,
  };
  save('fork-accounts.json', accounts);
  save('manifest.json', manifest);
  console.log(
    JSON.stringify(
      {
        source: {
          owner: source.owner,
          wallet: sourceToken.wallet,
          tracker: source.tracker,
          issuances: source.issuanceCount,
        },
        destination: destinationToken.wallet,
        controller: controller.toBase58(),
        role: role.address,
        accounts: Object.keys(accounts).length,
        slot,
      },
      null,
      2
    )
  );
}
if (require.main === module)
  prepare().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
