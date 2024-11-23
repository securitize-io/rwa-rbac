import * as anchor from "@coral-xyz/anchor";
import { BN, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { assert } from "chai";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import { setupTests } from "./setup";
import {
  AdminFlags,
  generateUniqueSeed,
  MediciFlags,
  RwaRbacClient,
} from "../client/src/index";
import {
  getAssetControllerPda,
  getIdentityAccount,
  getIdentityAccountPda,
  getPolicyEngineAccount,
  getPolicyEnginePda,
  IssueTokenArgs,
  SetupAssetControllerArgs,
} from "../deps/rwa-token/clients/rwa-token-sdk/src";

describe("CPI End to End Tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  let rwaRbacClient: RwaRbacClient;
  let setup;
  let mint: string;
  let connection: Connection;
  let user1Ata: PublicKey;
  let assetController: PublicKey;
  let policyAccount: PublicKey;
  let policyEngine: PublicKey;

  before(async () => {
    setup = await setupTests(generateUniqueSeed());
    connection = setup.config.connection;
    rwaRbacClient = new RwaRbacClient(setup.config, new Wallet(setup.payerKp));
  });

  it("Create AssetAccessController successfully", async () => {
    const ix = await rwaRbacClient.createAssetAccessControllerIxn({
      payer: setup.payer,
      admin: setup.signer1,
      uniqueSeed: setup.uniqueSeed,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);
    const controllerAccount =
      await rwaRbacClient.rbacProgram.account.assetAccessController.fetch(
        setup.assetAccessController
      );
    assert(
      controllerAccount.controllerAuthority.equals(setup.controllerAuthority)
    );
    assert.equal(
      controllerAccount.controllerAuthorityBump,
      setup.controllerAuthorityBump
    );
    assert(controllerAccount.admin.equals(setup.signer1));
    assert(controllerAccount.uniqueSeed.eq(new BN(setup.uniqueSeed)));
    assert(controllerAccount.userRolesCount.eqn(0));
  });

  it("Initialize Asset Controller", async () => {
    const setupAssetControllerArgs: SetupAssetControllerArgs = {
      authority: setup.controllerAuthority.toString(),
      decimals: 2,
      payer: setup.payer.toString(),
      delegate: null,
      name: "Test Class Asset",
      uri: "https://test.com",
      symbol: "TFT",
      interestRate: null,
      requireIdentityCreation: false,
      enforcePolicyIssuance: false,
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
    user1Ata = getAssociatedTokenAddressSync(
      new PublicKey(mint),
      setup.user1,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    assetController = getAssetControllerPda(mint);
    policyEngine = getPolicyEnginePda(mint);
  });

  it("Create UserRole 1 successfully", async () => {
    const name = "Role1";
    const allowedAdminIxs = AdminFlags.NONE;
    const allowedMediciIxs = MediciFlags.NONE;

    const ix = await rwaRbacClient.createUserRoleIxn({
      name,
      allowedAdminIxs,
      allowedMediciIxs,
      payer: setup.payer,
      user: setup.signer1,
      assetAccessController: setup.assetAccessController,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    const userRoleAccount =
      await rwaRbacClient.rbacProgram.account.userRole.fetch(setup.userRole1);
    assert(
      userRoleAccount.assetAccessController.equals(setup.assetAccessController)
    );
    assert(userRoleAccount.id.eq(setup.roleId1));
    assert.equal(userRoleAccount.name, name);
    assert(userRoleAccount.allowedAdminIxs.eqn(allowedAdminIxs));
    assert(userRoleAccount.allowedMediciIxs.eqn(allowedMediciIxs));
    assert.equal(userRoleAccount.users.length, 0);

    const controllerAccount =
      await rwaRbacClient.rbacProgram.account.assetAccessController.fetch(
        setup.assetAccessController
      );
    assert(controllerAccount.userRolesCount.eqn(1));
  });

  it("CPI: Update Asset Metadata", async () => {
    const updateAssetMetadataArgs = {
      name: "Test Class Asset - Updated",
      assetMint: mint,
      authority: setup.controllerAuthority.toString(), // ControllerAuthority
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
    };
    const updateIx = await rwaRbacClient.assetController.updateAssetMetadata(
      updateAssetMetadataArgs,
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(updateIx),
      [setup.payerKp, setup.signer1Kp]
    );
  });

  it("CPI: Update Interest Bearing Mint Rate", async () => {
    const updateIx =
      await rwaRbacClient.assetController.updateInterestBearingMintRateIxn(
        {
          authority: setup.controllerAuthority.toString(), // ControllerAuthority
          payer: setup.payer.toString(), // Payer Account
          signer: setup.signer1.toString(), // User Account
          assetMint: mint,
          rate: 200,
        },
        setup.assetAccessController,
        setup.userRole1
      );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(updateIx),
      [setup.payerKp, setup.signer1Kp]
    );
  });

  it("CPI: Attach to Policy Engine", async () => {
    const ix = await rwaRbacClient.policyEngine.attachPolicy(
      {
        authority: setup.controllerAuthority.toString(), // ControllerAuthority
        payer: setup.payer.toString(), // Payer Account
        assetMint: mint,
        identityFilter: {
          identityLevels: [1],
          comparisionType: { or: {} },
          counterpartyFilter: { both: {} },
        },
        policyType: {
          transactionAmountLimit: {
            limit: new BN(10000),
          },
        },
      },
      setup.signer1, // User Account
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);
    const policyAccountData = await getPolicyEngineAccount(
      mint,
      rwaRbacClient.provider
    );
    assert.equal(policyAccountData.policies.length, 1);
  });

  it("CPI: Detach from Policy Account", async () => {
    let policyAccountData = await getPolicyEngineAccount(
      mint,
      rwaRbacClient.provider
    );

    for (const policy of policyAccountData?.policies ?? []) {
      const ix = await rwaRbacClient.policyEngine.detachPolicy(
        {
          authority: setup.controllerAuthority.toString(), // ControllerAuthority
          payer: setup.payer.toString(), // Payer Account
          owner: setup.user1.toString(), // Target Account
          assetMint: mint,
          hash: policy.hash,
        },
        setup.signer1, // User Account
        setup.assetAccessController,
        setup.userRole1
      );
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
        setup.payerKp,
        setup.signer1Kp,
      ]);
    }
    policyAccountData = await getPolicyEngineAccount(
      mint,
      rwaRbacClient.provider
    );
    assert.equal(policyAccountData.policies.length, 0);
  });

  it("CPI: Create Identity Account", async () => {
    const { ixs } = await rwaRbacClient.identityRegistry.setupUserIxns(
      {
        payer: setup.payer.toString(), // Payer Account
        signer: setup.signer1.toString(), // User Account
        owner: setup.user1.toString(), // Target Account
        assetMint: mint,
        levels: [1, 2, 3],
        expiry: [
          new BN(Date.now() / 1000 + 24 * 60 * 60),
          new BN(Date.now() / 1000 + 24 * 60 * 60),
          new BN(Date.now() / 1000 + 24 * 60 * 60),
        ],
      },
      setup.assetAccessController,
      setup.userRole1
    );
    const identityAccountIx = ixs[0];
    const addLevelIxs = ixs.slice(1, -1);
    const trackerAccountIx = ixs[ixs.length - 1];
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(identityAccountIx),
      [setup.payerKp, setup.signer1Kp]
    );
    // TODO: Send other instructions as well when Add Level is fixed.
    // await sendAndConfirmTransaction(connection, new Transaction().add(ixs[1]), [
    //   setup.payerKp,
    //   setup.signer1Kp,
    // ]);

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(trackerAccountIx),
      [setup.payerKp]
    );

    const identityAccountPda = getIdentityAccountPda(mint, setup.user1);
    const data = await rwaRbacClient.provider.connection.getAccountInfo(
      identityAccountPda
    );
    const identityAccount = await getIdentityAccount(
      mint,
      setup.user1,
      rwaRbacClient.provider
    );
  });

  it("CPI: Add Level to Identity Account", async () => {
    const expiry = new BN(Date.now() / 1000 + 24 * 60 * 60);
    const addLevelIx =
      await rwaRbacClient.identityRegistry.addIdentityLevelToUserAccount(
        {
          authority: setup.controllerAuthority.toString(), // ControllerAuthority
          payer: setup.payer.toString(), // Payer Account
          signer: setup.signer1.toString(), // User Account
          owner: setup.user1.toString(), // Target Account
          assetMint: mint,
          level: 2,
          expiry,
        },
        setup.assetAccessController,
        setup.userRole1
      );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(addLevelIx),
      [setup.payerKp, setup.signer1Kp]
    );

    const identityAccount = await getIdentityAccount(
      mint,
      setup.user1,
      rwaRbacClient.provider
    );

    // Level 2 should be added.
    assert.equal(identityAccount.levels.at(-1).level, 2);
    assert(identityAccount.levels.at(-1).expiry.eq(expiry));
  });

  it("CPI: Remove Level from Identity Account", async () => {
    const removeLevelIx =
      await rwaRbacClient.identityRegistry.removeIdentityLevelFromUserAccount(
        {
          payer: setup.payer.toString(), // Payer Account
          signer: setup.signer1.toString(), // User Account
          owner: setup.user1.toString(), // Target Account
          authority: setup.controllerAuthority.toString(), // ControllerAuthority
          assetMint: mint,
          level: 1,
        },
        setup.assetAccessController,
        setup.userRole1
      );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(removeLevelIx),
      [setup.payerKp, setup.signer1Kp]
    );

    const identityAccount = await getIdentityAccount(
      mint,
      setup.user1,
      rwaRbacClient.provider
    );

    // Level 1 should be removed.
    identityAccount.levels.forEach((level) => {
      assert.notEqual(level.level, 1);
    });
  });

  it("CPI: Refresh Level To Identity Account", async () => {
    const refreshArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      authority: setup.controllerAuthority.toString(), // ControllerAuthority
      assetMint: mint,
      level: 2,
      expiry: new BN(Date.now() / 1000 + 24 * 60 * 60),
    };
    const ix =
      await rwaRbacClient.identityRegistry.refreshLevelToIdentityAccountIxn(
        refreshArgs,
        setup.assetAccessController,
        setup.userRole1
      );
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    const identityAccountPost = await getIdentityAccount(
      refreshArgs.assetMint,
      refreshArgs.owner,
      rwaRbacClient.provider
    );
    assert.equal(identityAccountPost.levels[0].level, refreshArgs.level);
    assert(identityAccountPost.levels[0].expiry.eq(refreshArgs.expiry));
  });

  it("CPI: Issue Tokens", async () => {
    const issueArgs: IssueTokenArgs = {
      authority: setup.controllerAuthority.toString(), // ControllerAuthority
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      assetMint: mint,
      amount: 1000000,
    };
    const issueTokenIxns = await rwaRbacClient.assetController.issueTokenIxns(
      issueArgs,
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(...issueTokenIxns),
      [setup.payerKp, setup.signer1Kp]
    );
  });

  it("CPI: Revoke Identity Account", async () => {
    const revokeIx = await rwaRbacClient.identityRegistry.revokeIdentityIxn(
      {
        payer: setup.payer.toString(), // Payer Account
        signer: setup.signer1.toString(), // User Account
        owner: setup.user1.toString(), // Target Account
        authority: setup.controllerAuthority.toString(), // ControllerAuthority
        assetMint: mint,
      },
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(revokeIx),
      [setup.payerKp, setup.signer1Kp]
    );
  });

  it("CPI: Freeze Token Account", async () => {
    const freezeIx = await rwaRbacClient.assetController.freezeTokenIxn(
      {
        authority: setup.controllerAuthority.toString(), // ControllerAuthority
        payer: setup.payer.toString(), // Payer Account
        signer: setup.signer1.toString(), // User Account
        owner: setup.user1.toString(), // Target Account
        assetMint: mint,
      },
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(freezeIx),
      [setup.payerKp, setup.signer1Kp]
    );
  });

  it("CPI: Thaw Token Account", async () => {
    const thawIx = await rwaRbacClient.assetController.thawTokenIxn(
      {
        authority: setup.controllerAuthority.toString(), // ControllerAuthority
        payer: setup.payer.toString(), // Payer Account
        signer: setup.signer1.toString(), // User Account
        owner: setup.user1.toString(), // Target Account
        assetMint: mint,
      },
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(thawIx), [
      setup.payerKp,
      setup.signer1Kp,
    ]);
  });

  it("CPI: Revoke Tokens", async () => {
    const revokeIxs = await rwaRbacClient.assetController.revokeTokenIxn(
      {
        owner: setup.user1.toString(), // Target Account
        assetMint: mint,
        amount: 100,
        authority: setup.controllerAuthority.toString(), // ControllerAuthority
      },
      setup.payer, // Payer Account
      setup.signer1, // User Account
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(...revokeIxs),
      [setup.payerKp, setup.signer1Kp]
    );
  });
});
