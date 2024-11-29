import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  PublicKey,
  Connection,
  sendAndConfirmTransaction,
  Transaction,
  Keypair,
} from "@solana/web3.js";

import { setupTests } from "./setup";
import { generateUniqueSeed, RwaRbacClient } from "../client/src/index";
import { CreateAssetControllerIx } from "../deps/rwa-token/clients/rwa-token-sdk/src";
import { ComputeBudgetProgram } from "@solana/web3.js";

describe("CloseMint Ixs Test", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  let rwaRbacClient: RwaRbacClient;
  let setup;
  let mint: string;
  let connection: Connection;

  before(async () => {
    setup = await setupTests(generateUniqueSeed());
    connection = setup.config.connection;
    rwaRbacClient = new RwaRbacClient(setup.config, new Wallet(setup.payerKp));

    const ix = await rwaRbacClient.createAssetAccessControllerIxn({
      payer: setup.payer,
      admin: setup.signer1,
      uniqueSeed: setup.uniqueSeed,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    const assetMintKp = Keypair.generate();
    const args: CreateAssetControllerIx = {
      authority: setup.controllerAuthority.toString(),
      decimals: 2,
      payer: setup.payer.toString(),
      delegate: null,
      name: "Test Class Asset",
      uri: "https://test.com",
      symbol: "TFT",
      interestRate: null,
      assetMint: assetMintKp.publicKey.toString(),
      enforcePolicyIssuance: false,
      allowMultipleWallets: true,
    };
    const setupIx = await rwaRbacClient.assetController.setupNewRegistry(args);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        setupIx
      ),
      [setup.payerKp, assetMintKp]
    );

    // Store values for later use
    mint = args.assetMint;
  });

  // Callable only when mint supply is 0.
  it("CPI: Close Mint Account", async () => {
    const authorityBalancePre = await connection.getBalance(
      setup.controllerAuthority
    );

    const closeMintIx = await rwaRbacClient.assetController.closeMintIxn(
      {
        authority: setup.controllerAuthority.toString(), // ControllerAuthority
        payer: setup.payer.toString(), // Payer Account
        signer: setup.signer1.toString(), // User Account
        assetMint: mint,
      },
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(closeMintIx),
      [setup.payerKp, setup.signer1Kp]
    );

    // Check that mint is closed.
    const mintAccount = await connection.getAccountInfo(new PublicKey(mint));
    assert.isNull(mintAccount);

    const authorityBalancePost = await connection.getBalance(
      setup.controllerAuthority
    );

    // Check that SOL is returned to ControllerAuthority on Mint closure.
    const solGained = authorityBalancePost - authorityBalancePre;
    assert(solGained > 0);
  });

  it("Withdraws balance SOL from ControllerAuthority", async () => {
    const ix = await rwaRbacClient.withdrawExcessRentIxn({
      receiver: setup.payer,
      admin: setup.signer1,
      controllerAuthority: setup.controllerAuthority,
      assetAccessController: setup.assetAccessController,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.signer1Kp,
    ]);

    // Check that all SOL is transferred from ControllerAuthority PDA.
    const authorityBalancePost = await connection.getBalance(
      setup.controllerAuthority
    );
    assert.equal(authorityBalancePost, 0);
  });
});
