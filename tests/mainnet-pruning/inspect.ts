import { BorshAccountsCoder } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import * as sdk from '@dstoken-solana/rwa-token-sdk';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export const MINT = 'GyWgeqpy5GueU2YbkE8xqUeVEokCMMCEeUrfbtMw6phr';
export const output = join(__dirname, 'artifacts');
export const endpoint = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
export async function rpc(method: string, params: unknown[], url = endpoint): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`${method}: HTTP ${response.status}`);
  const json = (await response.json()) as any;
  if (json.error) throw new Error(`${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}
export function save(name: string, value: unknown) {
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, name), JSON.stringify(value, null, 2) + '\n');
}
export function decode(idl: any, name: string, account: any): any {
  return new BorshAccountsCoder(idl).decode(name, Buffer.from(account.data[0], 'base64'));
}
export async function inspect() {
  const mint = await rpc('getAccountInfo', [MINT, { encoding: 'base64' }]);
  save('mint.json', mint);
  const registry = sdk.getIdentityRegistryPda(MINT);
  const accounts = await rpc('getProgramAccounts', [
    sdk.identityRegistryProgramId.toBase58(),
    {
      encoding: 'base64',
      filters: [{ memcmp: { offset: 9, bytes: registry.toBase58() } }],
    },
  ]);
  save('identities.json', accounts);
  const owners = accounts.map((a: any) =>
    decode(sdk.IdentityRegistryIdl, 'IdentityAccount', a.account).owner.toBase58()
  );
  const trackers = owners.map((o: string) => sdk.getTrackerAccountPda(MINT, o).toBase58());
  const data = await rpc('getMultipleAccounts', [trackers, { encoding: 'base64' }]);
  save('trackers.json', data);
  const policy = await rpc('getAccountInfo', [sdk.getPolicyEnginePda(MINT).toBase58(), { encoding: 'base64' }]);
  save('policy.json', policy);
  const report = accounts.map((a: any, i: number) => {
    const identity = decode(sdk.IdentityRegistryIdl, 'IdentityAccount', a.account);
    const tracker = data.value[i] && decode(sdk.PolicyEngineIdl, 'TrackerAccount', data.value[i]);
    return {
      identity: a.pubkey,
      owner: owners[i],
      country: identity.country,
      tracker: trackers[i],
      bytes: data.value[i]?.space,
      issuanceCount: tracker?.issuances.length,
      trackerState: tracker,
      identityState: identity,
    };
  });
  save('investors.json', report);
  console.table(
    report.map(({ trackerState, identityState, ...summary }: any) => ({
      ...summary,
      investor: identityState.levels.some((level: any) => level.level === 1),
      totalAmount: trackerState.total_amount.toString(),
    }))
  );
}
if (require.main === module)
  inspect().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
