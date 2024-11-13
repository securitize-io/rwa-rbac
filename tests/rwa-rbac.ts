import * as anchor from "@coral-xyz/anchor";
import { Program, BN, Wallet } from "@coral-xyz/anchor";
import {
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
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
import { RwaRbacClient } from "../client/src/index";

describe("rwa-rbac", () => {
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

  // Test setup
  const decimals = 2;
  const roleId1 = new BN(1);
  const roleId2 = new BN(2);
  const uniqueSeed = 77;
  const payer = program.provider.publicKey;

  const signer1 = Keypair.generate();
  const signer2 = Keypair.generate();
  const signer3 = Keypair.generate();

  before(async () => {
    setup = await setupTests(uniqueSeed);

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
      admin: signer1.publicKey,
      uniqueSeed,
    });
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, signer1]
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
    assert(controllerAccount.admin.equals(signer1.publicKey));
    assert(controllerAccount.uniqueSeed.eqn(uniqueSeed));
    assert(controllerAccount.userRolesCount.eqn(0));
  });

  it("Initialize Asset Controller", async () => {
    const setupAssetControllerArgs = {
      decimals,
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
      user: signer1.publicKey,
      assetAccessController: setup.assetAccessController,
    });
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, signer1]
    );

    const userRoleAccount = await program.account.userRole.fetch(
      setup.userRole1
    );
    assert(
      userRoleAccount.assetAccessController.equals(setup.assetAccessController)
    );
    assert(userRoleAccount.id.eq(roleId1));
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
        user: signer2.publicKey,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
      });
      await sendAndConfirmTransaction(
        rwaRbacClient.provider.connection,
        new Transaction().add(ix),
        [setup.payerKp, signer2]
      );
      await sendAndConfirmTransaction(
        rwaRbacClient.provider.connection,
        new Transaction().add(ix),
        [setup.payerKp, signer2]
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
      usersToAssign: [signer2.publicKey, signer3.publicKey],
      userRole: setup.userRole1,
      payer: setup.payer,
      user: signer1.publicKey,
      assetAccessController: setup.assetAccessController,
    });
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, signer1]
    );

    const userRoleAccount = await program.account.userRole.fetch(
      setup.userRole1
    );
    const userRoleDataLenPost = (
      await connection.getAccountInfo(setup.userRole1)
    ).data.length;
    assert.equal(userRoleDataLenPost - userRoleDataLenPre, 64);
    assert.equal(userRoleAccount.users.length, 2);
    assert(userRoleAccount.users[0].equals(signer2.publicKey));
    assert(userRoleAccount.users[1].equals(signer3.publicKey));
  });

  it("CPI: Update Asset Metadata", async () => {
    const updateAssetMetadataArgs = {
      name: "Test Class Asset - Updated",
      assetMint: mint,
      authority: setup.controllerAuthority.toString(), // ControllerAuthority
      payer: setup.payer.toString(), // Payer Account
      signer: signer1.publicKey.toString(), // User Account
    };
    const updateIx = await rwaRbacClient.assetController.updateAssetMetadata(
      updateAssetMetadataArgs,
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(updateIx),
      [setup.payerKp, signer1]
    );
  });

  // Callable only when mint supply is 0. Following tests would fail.
  it.skip("CPI: Close Mint Account", async () => {
    const closeMintIx = await rwaRbacClient.assetController.closeMintIxn(
      {
        authority: setup.controllerAuthority.toString(), // ControllerAuthority
        payer: setup.payer.toString(), // Payer Account
        signer: signer1.publicKey.toString(), // User Account
        assetMint: mint,
      },
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(closeMintIx),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Issue Tokens", async () => {
    const issueArgs: IssueTokenArgs = {
      authority: setup.controllerAuthority.toString(), // ControllerAuthority
      payer: setup.payer.toString(), // Payer Account
      signer: signer1.publicKey.toString(), // User Account
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
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Freeze Token Account", async () => {
    const freezeIx = await rwaRbacClient.assetController.freezeTokenIxn(
      {
        authority: setup.controllerAuthority.toString(), // ControllerAuthority
        payer: setup.payer.toString(), // Payer Account
        signer: signer1.publicKey.toString(), // User Account
        owner: setup.user1.toString(), // Target Account
        assetMint: mint,
      },
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(freezeIx),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Thaw Token Account", async () => {
    const thawIx = await rwaRbacClient.assetController.thawTokenIxn(
      {
        authority: setup.controllerAuthority.toString(), // ControllerAuthority
        payer: setup.payer.toString(), // Payer Account
        signer: signer1.publicKey.toString(), // User Account
        owner: setup.user1.toString(), // Target Account
        assetMint: mint,
      },
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(thawIx),
      [setup.payerKp, signer1]
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
      signer1.publicKey, // User Account
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(...revokeIxs),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Update Interest Bearing Mint Rate", async () => {
    const updateIx =
      await rwaRbacClient.assetController.updateInterestBearingMintRateIxn(
        {
          authority: setup.controllerAuthority.toString(), // ControllerAuthority
          payer: setup.payer.toString(), // Payer Account
          signer: signer1.publicKey.toString(), // User Account
          assetMint: mint,
          rate: 200,
        },
        setup.assetAccessController,
        setup.userRole1
      );
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(updateIx),
      [setup.payerKp, signer1]
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
      signer1.publicKey,
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, signer1]
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
      signer1.publicKey, // User Account
      setup.assetAccessController,
      setup.userRole1
    );
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, signer1]
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
        signer1.publicKey, // User Account
        setup.assetAccessController,
        setup.userRole1
      );
      await sendAndConfirmTransaction(
        rwaRbacClient.provider.connection,
        new Transaction().add(ix),
        [setup.payerKp, signer1]
      );
    }
    policyAccountData = await getPolicyAccount(mint, rwaRbacClient.provider);
    assert.equal(policyAccountData.policies.length, 0);
  });

  it("CPI: Create Identity Account", async () => {
    const { ixs } = await rwaRbacClient.identityRegistry.setupUserIxns(
      {
        payer: setup.payer.toString(), // Payer Account
        signer: signer1.publicKey.toString(), // User Account
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
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Add Level to Identity Account", async () => {
    const addLevelIx =
      await rwaRbacClient.identityRegistry.addIdentityLevelToUserAccount(
        {
          authority: setup.controllerAuthority.toString(), // ControllerAuthority
          payer: setup.payer.toString(), // Payer Account
          signer: signer1.publicKey.toString(), // User Account
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
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Remove Level from Identity Account", async () => {
    const removeLevelIx =
      await rwaRbacClient.identityRegistry.removeIdentityLevelFromUserAccount(
        {
          payer: setup.payer.toString(), // Payer Account
          signer: signer1.publicKey.toString(), // User Account
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
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Revoke Identity Account", async () => {
    const revokeIx = await rwaRbacClient.identityRegistry.revokeIdentityIxn(
      {
        payer: setup.payer.toString(), // Payer Account
        signer: signer1.publicKey.toString(), // User Account
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
      [setup.payerKp, signer1]
    );
  });

  it("Create UserRole 2 successfully with authorized UserRole", async () => {
    const name = "Role2";
    const allowedAdminIxs = 0;
    const allowedMediciIxs = 0;

    const ix = await rwaRbacClient.createUserRoleIxn({
      payer: setup.payer,
      user: signer2.publicKey,
      assetAccessController: setup.assetAccessController,
      name,
      allowedAdminIxs,
      allowedMediciIxs,
      authorizedUserRole: setup.userRole1,
    });
    await sendAndConfirmTransaction(
      rwaRbacClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, signer2]
    );

    const userRoleAccount = await program.account.userRole.fetch(
      setup.userRole2
    );
    assert(
      userRoleAccount.assetAccessController.equals(setup.assetAccessController)
    );
    assert(userRoleAccount.id.eq(roleId2));
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
