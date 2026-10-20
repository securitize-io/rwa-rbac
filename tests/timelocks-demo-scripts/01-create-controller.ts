import { ComputeBudgetProgram } from '@solana/web3.js';
import { deriveAssetAccessControllerPda } from '../../client/src';
import { context, print, run, saveState, send } from './common';

run(async () => {
  const { state, admin, assetMint, connection, client } = context();
  const instruction = await client.createAssetAccessControllerIxn({
    payer: admin.publicKey,
    admin: admin.publicKey,
    assetMint: assetMint.publicKey,
    decimals: 2,
    name: 'Timelock Demo Asset',
    uri: 'https://example.com/timelock-demo.json',
    symbol: 'TLD',
  });
  const signature = await send(
    connection,
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }), instruction],
    [admin, assetMint]
  );
  const controller = deriveAssetAccessControllerPda(assetMint.publicKey);
  state.assetAccessController = controller.toBase58();
  saveState(state);
  print('AssetAccessController created', {
    signature,
    address: controller,
    account: await client.rbacProgram.account.assetAccessController.fetch(controller),
  });
});
