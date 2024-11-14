import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { setupTests } from "./setup";
import { generateUniqueSeed, RwaRbacClient } from "../client/src/index";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";

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

    const setupAssetControllerArgs = {
      decimals: 2,
      payer: setup.payer.toString(),
      authority: setup.controllerAuthority.toString(),
      name: "Test Class Asset",
      uri: "https://test.com",
      symbol: "TFT",
    };
    const setupIx = await rwaRbacClient.assetController.setupNewRegistry(
      setupAssetControllerArgs
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(...setupIx.ixs),
      [setup.payerKp, ...setupIx.signers]
    );

    // Store values for later use
    mint = setupIx.signers[0].publicKey.toString();
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
    await rwaRbacClient.rbacProgram.methods
      .withdrawExcessRent()
      .accounts({
        receiver: setup.payer,
        admin: setup.signer1,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
      })
      .signers([setup.payerKp, setup.signer1Kp])
      .rpc();

    // Check that all SOL is transferred from ControllerAuthority PDA.
    const authorityBalancePost = await connection.getBalance(
      setup.controllerAuthority
    );
    assert.equal(authorityBalancePost, 0);
  });
});
