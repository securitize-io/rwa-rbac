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
  getAssetControllerPda,
  getPolicyAccount,
  getPolicyAccountPda,
  getPolicyEnginePda,
  IssueTokenArgs,
} from "@bridgesplit/rwa-token-sdk";
import { setupTests } from "./setup";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
  AdminFlags,
  generateUniqueSeed,
  MediciFlags,
  RwaRbacClient,
} from "../client/src/index";

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
    user1Ata = getAssociatedTokenAddressSync(
      new PublicKey(mint),
      setup.user1,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    assetController = getAssetControllerPda(mint);
    policyEngine = getPolicyEnginePda(mint);
    policyAccount = getPolicyAccountPda(mint);
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

  it("CPI: Create Policy Account", async () => {
    const ix = await rwaRbacClient.policyEngine.createPolicy(
      {
        authority: setup.controllerAuthority.toString(),
        assetMint: mint,
        payer: setup.payer,
        identityFilter: {
          identityLevels: [1],
          comparisionType: { or: {} },
        },
        policyType: {
          identityApproval: {},
        },
      },
      setup.signer1,
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);
  });

  it("CPI: Attach to Policy Account", async () => {
    const ix = await rwaRbacClient.policyEngine.attachPolicy(
      {
        authority: setup.controllerAuthority.toString(), // ControllerAuthority
        payer: setup.payer.toString(), // Payer Account
        assetMint: mint,
        identityFilter: {
          identityLevels: [1],
          comparisionType: { or: {} },
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
    const policyAccountData = await getPolicyAccount(
      mint,
      rwaRbacClient.provider
    );
    assert.equal(policyAccountData.policies.length, 2);
  });

  it("CPI: Detach from Policy Account", async () => {
    let policyAccountData = await getPolicyAccount(
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
    policyAccountData = await getPolicyAccount(mint, rwaRbacClient.provider);
    assert.equal(policyAccountData.policies.length, 0);
  });

  it("CPI: Create Identity Account", async () => {
    const { ixs } = await rwaRbacClient.identityRegistry.setupUserIxns(
      {
        payer: setup.payer.toString(), // Payer Account
        signer: setup.signer1.toString(), // User Account
        owner: setup.user1.toString(), // Target Account
        assetMint: mint,
        levels: [1],
      },
      setup.controllerAuthority,
      setup.assetAccessController,
      setup.userRole1
    );
    const [identityAccountIx] = ixs;
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(identityAccountIx),
      [setup.payerKp, setup.signer1Kp]
    );
  });

  it("CPI: Add Level to Identity Account", async () => {
    const addLevelIx =
      await rwaRbacClient.identityRegistry.addIdentityLevelToUserAccount(
        {
          authority: setup.controllerAuthority.toString(), // ControllerAuthority
          payer: setup.payer.toString(), // Payer Account
          signer: setup.signer1.toString(), // User Account
          owner: setup.user1.toString(), // Target Account
          assetMint: mint,
          level: 2,
        },
        setup.assetAccessController,
        setup.userRole1
      );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(addLevelIx),
      [setup.payerKp, setup.signer1Kp]
    );
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
          level: 2,
        },
        setup.assetAccessController,
        setup.userRole1
      );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(removeLevelIx),
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
});
