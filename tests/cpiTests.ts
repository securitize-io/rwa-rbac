import * as anchor from "@coral-xyz/anchor";
import { BN, Wallet } from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { assert } from "chai";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import { setupTests } from "./utils";
import { AdminFlags, MediciFlags, RwaRbacClient } from "../client/src/index";
import {
  CreateAssetControllerIx,
  getAssetControllerPda,
  getIdentityAccountFromOwner,
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getPolicyEngineAccount,
  getPolicyEnginePda,
  IssueTokenArgs,
} from "../deps/rwa-token/clients/rwa-token-sdk/src";
import {
  deriveIdentityToOwnerPda,
  deriveInvestorPda,
} from "../client/src/pdas";

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

  const INVESTOR_ID = "d1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
  const INVESTOR_ID2 = "d4b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
  const PLACEHOLDER_HASH1 = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
  const PLACEHOLDER_HASH2 = "b1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";

  before(async () => {
    setup = await setupTests();
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
    assert(controllerAccount.uniqueSeed.equals(setup.uniqueSeed));
    assert(controllerAccount.userRolesCount.eqn(0));
  });

  it("Initialize Asset Controller", async () => {
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

  it("CPI: Register Investor", async () => {
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      assetMint: mint,
      investorId: INVESTOR_ID,
      collisionHash: PLACEHOLDER_HASH2,
      levels: [1, 5],
      expiries: [
        new BN(Date.now() / 1000 + 24 * 60 * 60),
        new BN(Date.now() / 1000 + 30 * 60 * 60),
      ],
      proofHashes: [PLACEHOLDER_HASH1, PLACEHOLDER_HASH2],
    };
    const ixReturn = await rwaRbacClient.identityMetadataRegistry.setupUserIxns(
      args,
      setup.assetAccessController,
      setup.userRole1
    );

    // Sending in separate transactions as workaround to an unexplained local websocket error.
    const tx1 = new Transaction().add(...ixReturn.ixs.slice(0, -1));
    await sendAndConfirmTransaction(connection, tx1, [
      setup.payerKp,
      setup.signer1Kp,
    ]);
    const tx2 = new Transaction().add(...ixReturn.ixs.slice(-1));
    await sendAndConfirmTransaction(connection, tx2, [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    // Validate Investor, IdentityToInvestor and IdentityAccount
    const investorPda = deriveInvestorPda(
      args.investorId,
      getIdentityRegistryPda(mint)
    );
    const identityAccountPda = getIdentityAccountPda(mint, setup.user1);
    const identityToInvestor = deriveIdentityToOwnerPda(identityAccountPda);

    const identityToInvestorAccount =
      await rwaRbacClient.identityMetadataRegistry.imrProgram.account.identityToInvestor.fetch(
        identityToInvestor
      );
    assert(
      identityToInvestorAccount.identityAccount.equals(identityAccountPda)
    );
    assert(identityToInvestorAccount.investor.equals(investorPda));

    const rawData = await rwaRbacClient.provider.connection.getAccountInfo(
      investorPda
    );
    const investorAccount =
      await rwaRbacClient.identityMetadataRegistry.imrProgram.account.investor.fetch(
        investorPda
      );
    assert.equal(investorAccount.investorId, args.investorId);
    assert.equal(investorAccount.collisionHash, args.collisionHash);
    assert(investorAccount.authority.equals(setup.controllerAuthority));
    assert.equal(investorAccount.lastUpdatedBy.toString(), args.payer);
    assert(investorAccount.identityAccount.equals(identityAccountPda));
    assert.equal(investorAccount.levels.length, 2);
    investorAccount.levels.map((x, idx) => {
      assert.equal(x.level, args.levels[idx]);
      assert.equal(x.proofHash, args.proofHashes[idx]);
    });

    const identityAccount = await getIdentityAccountFromOwner(
      mint,
      setup.user1,
      rwaRbacClient.provider
    );
    assert.equal(identityAccount.owner.toString(), args.owner);
    assert.equal(identityAccount.levels.length, 2);
    identityAccount.levels.map((x, idx) => {
      assert.equal(x.level, args.levels[idx]);
      assert(x.expiry.eq(args.expiries[idx]));
    });
  });

  it("CPI: Create Identity Account", async () => {
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user2.toString(), // Target Account
      assetMint: mint,
      levels: [1, 5],
      expiry: [
        new BN(Date.now() / 1000 + 24 * 60 * 60),
        new BN(Date.now() / 1000 + 30 * 60 * 60),
      ],
    };
    const ixReturn = await rwaRbacClient.identityRegistry.setupUserIxns(
      args,
      setup.assetAccessController,
      setup.userRole1
    );

    // Sending in separate transactions as workaround to an unexplained local websocket error.
    const tx1 = new Transaction().add(...ixReturn.ixs.slice(0, -1));
    await sendAndConfirmTransaction(connection, tx1, [
      setup.payerKp,
      setup.signer1Kp,
    ]);
    const tx2 = new Transaction().add(...ixReturn.ixs.slice(-1));
    await sendAndConfirmTransaction(connection, tx2, [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    // Validate IdentityAccount
    const identityAccount = await getIdentityAccountFromOwner(
      mint,
      setup.user2,
      rwaRbacClient.provider
    );
    assert.equal(identityAccount.owner.toString(), args.owner);
    assert.equal(identityAccount.levels.length, 2);
    identityAccount.levels.map((x, idx) => {
      assert.equal(x.level, args.levels[idx]);
      assert(x.expiry.eq(args.expiry[idx]));
    });
  });

  it("CPI: Add Level direct fails when Investor exists", async () => {
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      authority: setup.controllerAuthority,
      assetMint: mint,
      levels: [3],
      expiries: [new BN(Date.now() / 1000 + 24 * 60 * 60)],
    };
    const ix =
      await rwaRbacClient.identityRegistry.addIdentityLevelToUserAccount(
        args,
        setup.assetAccessController,
        setup.userRole1
      );

    try {
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
        setup.payerKp,
        setup.signer1Kp,
      ]);
      assert(false);
    } catch (err) {
      assert(err.toString().includes("DataIsNotEmpty"));
    }
  });

  it("CPI: Add Level direct succeeds when Investor does not exist", async () => {
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user2.toString(), // Target Account
      authority: setup.controllerAuthority,
      assetMint: mint,
      levels: [3],
      expiries: [new BN(Date.now() / 1000 + 24 * 60 * 60)],
    };
    const ix =
      await rwaRbacClient.identityRegistry.addIdentityLevelToUserAccount(
        args,
        setup.assetAccessController,
        setup.userRole1
      );

    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    // Validate IdentityAccount
    const identityAccount = await getIdentityAccountFromOwner(
      mint,
      setup.user2,
      rwaRbacClient.provider
    );
    assert.equal(identityAccount.owner.toString(), args.owner);
    assert.equal(identityAccount.levels.length, 3);
    assert(identityAccount.levels[2].expiry.eq(args.expiries[0]));
  });

  it("CPI: Add Levels through Investor", async () => {
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      assetMint: mint,
      investorId: INVESTOR_ID,
      levels: [6, 7, 8],
      expiries: [
        new BN(Date.now() / 1000 + 24 * 60 * 60),
        new BN(Date.now() / 1000 + 24 * 60 * 60),
        new BN(Date.now() / 1000 + 24 * 60 * 60),
      ],
      proofHashes: [PLACEHOLDER_HASH1, PLACEHOLDER_HASH2, PLACEHOLDER_HASH1],
    };
    const ix = await rwaRbacClient.identityMetadataRegistry.addLevels(
      args,
      setup.assetAccessController,
      setup.userRole1
    );
    const cb = ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 });
    await sendAndConfirmTransaction(connection, new Transaction().add(cb, ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    // Validate Investor and IdentityAccount
    const investorPda = deriveInvestorPda(
      args.investorId,
      getIdentityRegistryPda(mint)
    );
    const investorAccount =
      await rwaRbacClient.identityMetadataRegistry.imrProgram.account.investor.fetch(
        investorPda
      );
    assert(
      investorAccount.identityRegistry.equals(getIdentityRegistryPda(mint))
    );
    assert.equal(investorAccount.lastUpdatedBy.toString(), args.payer);
    assert.equal(investorAccount.levels.length, 5);
    investorAccount.levels.slice(2).map((v, idx) => {
      assert.equal(v.level, args.levels[idx]);
      assert.equal(v.proofHash, args.proofHashes[idx]);
    });

    const identityAccount = await getIdentityAccountFromOwner(
      mint,
      setup.user1,
      rwaRbacClient.provider
    );
    assert.equal(identityAccount.levels.length, 5);
    identityAccount.levels.slice(2).map((v, idx) => {
      assert.equal(v.level, args.levels[idx]);
      assert(v.expiry.eq(args.expiries[idx]));
    });
  });

  it("CPI: Remove Level direct fails when Investor exists", async () => {
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      authority: setup.controllerAuthority,
      assetMint: mint,
      levels: [1],
    };
    const ix =
      await rwaRbacClient.identityRegistry.removeIdentityLevelFromUserAccount(
        args,
        setup.assetAccessController,
        setup.userRole1
      );

    try {
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
        setup.payerKp,
        setup.signer1Kp,
      ]);
      assert(false);
    } catch (err) {
      assert(err.toString().includes("DataIsNotEmpty"));
    }
  });

  it("CPI: Remove Level direct suceeds when Investor does not exist", async () => {
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user2.toString(), // Target Account
      authority: setup.controllerAuthority,
      assetMint: mint,
      levels: [1],
      enforceLimits: true,
    };
    const ix =
      await rwaRbacClient.identityRegistry.removeIdentityLevelFromUserAccount(
        args,
        setup.assetAccessController,
        setup.userRole1
      );

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [setup.payerKp, setup.signer1Kp],
      {
        skipPreflight: true,
      }
    );

    // Validate IdentityAccount has only 2 levels remaining.
    const identityAccount = await getIdentityAccountFromOwner(
      mint,
      setup.user2,
      rwaRbacClient.provider
    );
    assert.equal(identityAccount.owner.toString(), args.owner);
    assert.equal(identityAccount.levels.length, 2);
  });

  it("CPI: Remove Levels through Investor", async () => {
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      assetMint: mint,
      investorId: INVESTOR_ID,
      levels: [6, 7, 8],
      enforceLimits: true,
    };
    const ix = await rwaRbacClient.identityMetadataRegistry.removeLevels(
      args,
      setup.assetAccessController,
      setup.userRole1
    );
    const cb = ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 });
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(cb, ix),
      [setup.payerKp, setup.signer1Kp],
      {
        skipPreflight: true,
      }
    );

    // Validate Investor and IdentityAccount
    const investorPda = deriveInvestorPda(
      args.investorId,
      getIdentityRegistryPda(mint)
    );
    const investorAccount =
      await rwaRbacClient.identityMetadataRegistry.imrProgram.account.investor.fetch(
        investorPda
      );
    assert.equal(investorAccount.lastUpdatedBy.toString(), args.payer);
    assert.equal(investorAccount.levels.length, 2);
    assert.equal(investorAccount.levels[0].level, 1);
    assert.equal(investorAccount.levels[1].level, 5);

    const identityAccount = await getIdentityAccountFromOwner(
      mint,
      setup.user1,
      rwaRbacClient.provider
    );
    assert.equal(identityAccount.levels.length, 2);
    assert.equal(identityAccount.levels[0].level, 1);
    assert.equal(identityAccount.levels[1].level, 5);
  });

  it("CPI: Refresh Level To Identity Account", async () => {
    const refreshArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      authority: setup.controllerAuthority.toString(), // ControllerAuthority
      assetMint: mint,
      level: 1,
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

    const identityAccountPost = await getIdentityAccountFromOwner(
      refreshArgs.assetMint,
      refreshArgs.owner,
      rwaRbacClient.provider
    );
    assert.equal(identityAccountPost.levels[0].level, refreshArgs.level);
    assert(identityAccountPost.levels[0].expiry.eq(refreshArgs.expiry));
  });

  it("CPI: Attach Wallet to Identity", async () => {
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      assetMint: mint,
      wallet: setup.user3,
    };
    const ix = await rwaRbacClient.identityRegistry.attachWalletToIdentityIxn(
      args,
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    // Check wallet count
    const identityAccount = await getIdentityAccountFromOwner(
      mint,
      args.owner,
      rwaRbacClient.provider
    );
    assert.equal(identityAccount.numWallets, 1);
  });

  it("CPI: Detach Wallet from Identity", async () => {
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      assetMint: mint,
      wallet: setup.user3,
    };
    const ix = await rwaRbacClient.identityRegistry.detachWalletFromIdentityIxn(
      args,
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    // Check wallet count
    const identityAccount = await getIdentityAccountFromOwner(
      mint,
      args.owner,
      rwaRbacClient.provider
    );
    assert.equal(identityAccount.numWallets, 0);
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

  it("CPI: Seize Tokens", async () => {
    const args = {
      amount: 1,
      from: setup.user1,
      to: setup.user1,
      authority: setup.controllerAuthority,
      assetMint: mint,
    };
    const ix = await rwaRbacClient.assetController.seizeTokensIxn(
      args,
      setup.signer1.toString(),
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);
  });

  it("CPI: Remove Investor", async () => {
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      assetMint: mint,
      investorId: INVESTOR_ID,
    };
    const ix = await rwaRbacClient.identityMetadataRegistry.removeInvestor(
      args,
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    // Validate Investor and IdentityAccount
    const investorPda = deriveInvestorPda(
      args.investorId,
      getIdentityRegistryPda(mint)
    );
    const identityAccountPda = getIdentityAccountPda(mint, setup.user1);
    const identityToInvestor = deriveIdentityToOwnerPda(identityAccountPda);
    assert.isNull(
      await rwaRbacClient.provider.connection.getAccountInfo(investorPda)
    );
    assert.isNull(
      await rwaRbacClient.provider.connection.getAccountInfo(identityAccountPda)
    );
    assert.isNull(
      await rwaRbacClient.provider.connection.getAccountInfo(identityToInvestor)
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
