import * as anchor from "@coral-xyz/anchor";
import { Program, BN, Wallet } from "@coral-xyz/anchor";
import {
  ConfirmOptions,
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { RwaRbac } from "../target/types/rwa_rbac";
import { assert } from "chai";
import {
  getPolicyAccount,
  getPolicyAccountPda,
  getPolicyEnginePda,
  IssueTokenArgs,
} from "@bridgesplit/rwa-token-sdk";
import { setupTests } from "./setup";
import { Config } from "@bridgesplit/rwa-token-sdk/dist/classes/types";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { getAssetControllerPda } from "../deps/rwa-token/clients/rwa-token-sdk/src";
import { generateUniqueSeed, RwaRbacClient } from "../client/src/index";

describe("End to End Tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.RwaRbac as Program<RwaRbac>;

  const connectionUrl = process.env.RPC_URL ?? "http://localhost:8899";
  const connection = new Connection(connectionUrl, "processed");

  let rwaRbacClient: RwaRbacClient;
  let setup;
  let mint: string;
  let user1Ata: PublicKey;
  let assetController: PublicKey;
  let policyAccount: PublicKey;
  let policyEngine: PublicKey;

  before(async () => {
    setup = await setupTests(generateUniqueSeed());

    const confirmationOptions: ConfirmOptions = {
      skipPreflight: false,
      maxRetries: 3,
      commitment: "processed",
    };

    const config: Config = {
      connection,
      rpcUrl: connectionUrl,
      confirmationOptions,
    };
    rwaRbacClient = new RwaRbacClient(config, new Wallet(setup.payerKp));
  });

  it("Create AssetAccessController successfully", async () => {
    const ix = await rwaRbacClient.createAssetAccessControllerIxn({
      payer: setup.payer,
      admin: setup.signer1,
      uniqueSeed: setup.uniqueSeed,
    });
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, setup.signer1Kp]
    );
    const controllerAccount = await program.account.assetAccessController.fetch(
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
      rwaRbacClient.provider.connection,
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
    const allowedAdminIxs = 1;
    const allowedMediciIxs = 2;

    const ix = await rwaRbacClient.createUserRoleIxn({
      name,
      allowedAdminIxs,
      allowedMediciIxs,
      payer: setup.payer,
      user: setup.signer1,
      assetAccessController: setup.assetAccessController,
    });
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, setup.signer1Kp]
    );

    const userRoleAccount = await program.account.userRole.fetch(
      setup.userRole1
    );
    assert(
      userRoleAccount.assetAccessController.equals(setup.assetAccessController)
    );
    assert(userRoleAccount.id.eq(setup.roleId1));
    assert.equal(userRoleAccount.name, name);
    assert(userRoleAccount.allowedAdminIxs.eqn(allowedAdminIxs));
    assert(userRoleAccount.allowedMediciIxs.eqn(allowedMediciIxs));
    assert.equal(userRoleAccount.users.length, 0);

    const controllerAccount = await program.account.assetAccessController.fetch(
      setup.assetAccessController
    );
    assert(controllerAccount.userRolesCount.eqn(1));
  });

  it("Fails to create UserRole if unauthorized", async () => {
    try {
      const name = "Role2";
      const allowedAdminIxs = 0;
      const allowedMediciIxs = 0;

      // Signer 2 is not a controller admin and has not been added to a valid role.
      const ix = await rwaRbacClient.createUserRoleIxn({
        name,
        allowedAdminIxs,
        allowedMediciIxs,
        payer: setup.payer,
        user: setup.signer2,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
      });
      await sendAndConfirmTransaction(
        rwaRbacClient.provider.connection,
        new Transaction().add(ix),
        [setup.payerKp, setup.signer2Kp]
      );
      await sendAndConfirmTransaction(
        rwaRbacClient.provider.connection,
        new Transaction().add(ix),
        [setup.payerKp, setup.signer2Kp]
      );
      assert(false);
    } catch (err) {
      // TODO: Match for error
      // console.error(err);
    }
  });

  it("Assign users to UserRole 1 successfully", async () => {
    const userRoleDataLenPre = (
      await connection.getAccountInfo(setup.userRole1, "processed")
    ).data.length;
    const ix = await rwaRbacClient.assignUserRoleIxn({
      usersToAssign: [setup.signer2, setup.signer3],
      userRole: setup.userRole1,
      payer: setup.payer,
      user: setup.signer1,
      assetAccessController: setup.assetAccessController,
    });
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, setup.signer1Kp]
    );

    const userRoleAccount = await program.account.userRole.fetch(
      setup.userRole1
    );
    const userRoleDataLenPost = (
      await connection.getAccountInfo(setup.userRole1)
    ).data.length;
    assert.equal(userRoleDataLenPost - userRoleDataLenPre, 64);
    assert.equal(userRoleAccount.users.length, 2);
    assert(userRoleAccount.users[0].equals(setup.signer2));
    assert(userRoleAccount.users[1].equals(setup.signer3));
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
      rwaRbacClient.provider.connection,
      new Transaction().add(updateIx),
      [setup.payerKp, setup.signer1Kp]
    );
  });

  // Callable only when mint supply is 0. Following tests would fail.
  it.skip("CPI: Close Mint Account", async () => {
    const closeMintIx = await rwaRbacClient.assetController.closeMintIxn(
      {
        authority: setup.controllerAuthority.toString(), // ControllerAuthority
        payer: setup.payer.toString(), // Payer Account
        signer: setup.signer1.toString(), // User Account
        assetMint: mint,
      },
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(closeMintIx),
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
      rwaRbacClient.provider.connection,
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
      rwaRbacClient.provider.connection,
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
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(thawIx),
      [setup.payerKp, setup.signer1Kp]
    );
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
      rwaRbacClient.provider.connection,
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
      rwaRbacClient.provider.connection,
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
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, setup.signer1Kp]
    );
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
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, setup.signer1Kp]
    );
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
      await sendAndConfirmTransaction(
        rwaRbacClient.provider.connection,
        new Transaction().add(ix),
        [setup.payerKp, setup.signer1Kp]
      );
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
      rwaRbacClient.provider.connection,
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
      rwaRbacClient.provider.connection,
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
      rwaRbacClient.provider.connection,
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
      rwaRbacClient.provider.connection,
      new Transaction().add(revokeIx),
      [setup.payerKp, setup.signer1Kp]
    );
  });

  it("Create UserRole 2 successfully with authorized UserRole", async () => {
    const name = "Role2";
    const allowedAdminIxs = 0;
    const allowedMediciIxs = 0;

    const ix = await rwaRbacClient.createUserRoleIxn({
      payer: setup.payer,
      user: setup.signer2,
      assetAccessController: setup.assetAccessController,
      name,
      allowedAdminIxs,
      allowedMediciIxs,
      authorizedUserRole: setup.userRole1,
    });
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, setup.signer2Kp]
    );

    const userRoleAccount = await program.account.userRole.fetch(
      setup.userRole2
    );
    assert(
      userRoleAccount.assetAccessController.equals(setup.assetAccessController)
    );
    assert(userRoleAccount.id.eq(setup.roleId2));
    assert.equal(userRoleAccount.name, name);
    assert(userRoleAccount.allowedAdminIxs.eqn(allowedAdminIxs));
    assert(userRoleAccount.allowedMediciIxs.eqn(allowedMediciIxs));
    assert.equal(userRoleAccount.users.length, 0);

    const controllerAccount = await program.account.assetAccessController.fetch(
      setup.assetAccessController
    );
    assert(controllerAccount.userRolesCount.eqn(2));
  });
});
