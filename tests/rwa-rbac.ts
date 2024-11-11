import * as anchor from "@coral-xyz/anchor";
import { Program, BN, Wallet } from "@coral-xyz/anchor";
import {
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { RwaRbac } from "../target/types/rwa_rbac";
import { assert, config } from "chai";
import {
  assetControllerProgramId,
  AttachPolicyArgs,
  getAddLevelToIdentityAccount,
  getAssetControllerEventAuthority,
  getCloseMintIx,
  getCreateIdentityAccountIx,
  getCreatePolicyAccountIx,
  getExtraMetasListPda,
  getFreezeTokenIx,
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getIdentityRegistryProgram,
  getPolicyAccount,
  getPolicyAccountPda,
  getPolicyEnginePda,
  getPolicyEngineProgram,
  getRevokeTokensIx,
  getSetupUserIxs,
  getThawTokenIx,
  getTrackerAccountPda,
  getUpdateInterestBearingMintRateIx,
  identityRegistryProgramId,
  IssueTokenArgs,
  policyEngineProgramId,
  RwaClient,
  SetupUserArgs,
} from "@bridgesplit/rwa-token-sdk";
import { getIdentityMetadataPda, setupTests } from "./setup";
import { Config } from "@bridgesplit/rwa-token-sdk/dist/classes/types";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
  getAssetControllerPda,
  getRemoveLevelFromIdentityAccount,
} from "../deps/rwa-token/clients/rwa-token-sdk/src";

describe("rwa-rbac", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.RwaRbac as Program<RwaRbac>;

  const connectionUrl = process.env.RPC_URL ?? "http://localhost:8899";
  const connection = new Connection(connectionUrl, "processed");

  let rwaClient;
  let setup;
  let mint: string;
  let user1Ata: PublicKey;
  let assetController: PublicKey;
  let authorityAta: PublicKey;
  let eventAuthority: PublicKey;
  let policyAccount: PublicKey;
  let policyEngine: PublicKey;

  // Test setup
  const decimals = 2;
  const roleId1 = new BN(1);
  const roleId2 = new BN(2);
  const uniqueSeed = new BN(77);
  const payer = program.provider.publicKey;

  const signer1 = Keypair.generate();
  const signer2 = Keypair.generate();
  const signer3 = Keypair.generate();

  before(async () => {
    setup = await setupTests(uniqueSeed.toNumber());

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
    rwaClient = new RwaClient(config, new Wallet(setup.payerKp));
  });

  it("Create AssetAccessController successfully", async () => {
    await program.methods
      .createController(uniqueSeed)
      .accountsStrict({
        payer,
        admin: signer1.publicKey,
        assetAccessController: setup.assetAccessController,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer1])
      .rpc();

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
    assert(controllerAccount.uniqueSeed.eq(uniqueSeed));
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
    const setupIx = await rwaClient.assetController.setupNewRegistry(
      setupAssetControllerArgs
    );
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
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
    authorityAta = getAssociatedTokenAddressSync(
      new PublicKey(mint),
      assetController,
      true,
      TOKEN_2022_PROGRAM_ID
    );
    eventAuthority = getAssetControllerEventAuthority();
    policyEngine = getPolicyEnginePda(mint);
    policyAccount = getPolicyAccountPda(mint);
  });

  it("Create UserRole 1 successfully", async () => {
    const name = "Role1";
    const allowedAdminIxs = new BN(1);
    const allowedMediciIxs = new BN(2);

    await program.methods
      .createUserRole(name, allowedAdminIxs, allowedMediciIxs)
      .accountsStrict({
        payer,
        user: signer1.publicKey,
        newUserRole: setup.userRole1,
        authorizedUserRole: null,
        assetAccessController: setup.assetAccessController,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer1])
      .rpc();

    const userRoleAccount = await program.account.userRole.fetch(
      setup.userRole1
    );
    assert(
      userRoleAccount.assetAccessController.equals(setup.assetAccessController)
    );
    assert(userRoleAccount.id.eq(roleId1));
    assert.equal(userRoleAccount.name, name);
    assert(userRoleAccount.allowedAdminIxs.eq(allowedAdminIxs));
    assert(userRoleAccount.allowedMediciIxs.eq(allowedMediciIxs));
    assert.equal(userRoleAccount.users.length, 0);

    const controllerAccount = await program.account.assetAccessController.fetch(
      setup.assetAccessController
    );
    assert(controllerAccount.userRolesCount.eqn(1));
  });

  it("Fails to create UserRole if unauthorized", async () => {
    try {
      const name = "Role2";
      const allowedAdminIxs = new BN(0);
      const allowedMediciIxs = new BN(0);

      // Signer 2 is not a controller admin and has not been added to a valid role.
      await program.methods
        .createUserRole(name, allowedAdminIxs, allowedMediciIxs)
        .accountsStrict({
          payer,
          user: signer2.publicKey,
          newUserRole: setup.userRole2,
          authorizedUserRole: setup.userRole1,
          assetAccessController: setup.assetAccessController,
          systemProgram: SystemProgram.programId,
        })
        .signers([signer2])
        .rpc();
      assert(false);
    } catch (err) {
      // TODO: Match for error
      // console.error(err);
    }
  });

  it("Assign users to UserRole 1 successfully", async () => {
    const userRoleDataLenPre = (
      await connection.getAccountInfo(setup.userRole1)
    ).data.length;
    await program.methods
      .assignUserRole([signer2.publicKey, signer3.publicKey])
      .accountsStrict({
        payer,
        user: signer1.publicKey,
        userRole: setup.userRole1,
        authorizedUserRole: null,
        assetAccessController: setup.assetAccessController,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer1])
      .rpc();

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
      authority: setup.authority.toString(),
      name: "Test Class Asset - Updated",
      assetMint: mint,
      payer: setup.payer.toString(),
    };
    const updateIx = await rwaClient.assetController.updateAssetMetadata(
      updateAssetMetadataArgs
    );
    const data = updateIx.data;
    const wrappedIx = await program.methods
      .updateAssetMetadata(data)
      .accountsStrict({
        payer: setup.payer,
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        assetMint: mint,
        assetController,
        assetControllerProgram: assetControllerProgramId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        eventAuthority,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(wrappedIx),
      [setup.payerKp, signer1]
    );
  });

  // Callable only when mint supply is 0. Following tests would fail.
  it.skip("CPI: Close Mint Account", async () => {
    const closeIx = await getCloseMintIx(
      {
        authority: setup.controllerAuthority.toString(),
        assetMint: mint,
        payer: setup.payer.toString(),
      },
      rwaClient.provider
    );
    const data = closeIx.data;
    console.log({
      user: signer1.publicKey,
      controllerAuthority: setup.controllerAuthority,
      assetAccessController: setup.assetAccessController,
      authorizedUserRole: setup.userRole1,
      assetControllerProgram: assetControllerProgramId,
      assetMint: mint,
      assetController,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    });
    const wrappedIx = await program.methods
      .closeMintAccount(data)
      .accountsStrict({
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        assetControllerProgram: assetControllerProgramId,
        assetMint: mint,
        assetController,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(wrappedIx),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Issue Tokens", async () => {
    const issueArgs: IssueTokenArgs = {
      authority: setup.controllerAuthority,
      payer: setup.payer.toString(),
      owner: setup.user1.toString(),
      assetMint: mint,
      amount: 1000000,
    };
    const rawIx = await rwaClient.assetController.issueTokenIxns(issueArgs);
    const data = rawIx[0].data;
    const wrappedIx = await program.methods
      .issueTokens(data)
      .accountsStrict({
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        assetControllerProgram: assetControllerProgramId,
        assetMint: mint,
        assetController,
        to: setup.user1,
        tokenAccount: user1Ata,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    // ATA needs to be created separately as controller_pda cannot be payer.
    const createAtaIx = createAssociatedTokenAccountInstruction(
      setup.payer,
      user1Ata,
      setup.user1,
      new PublicKey(mint),
      TOKEN_2022_PROGRAM_ID
    );
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(...[createAtaIx, wrappedIx]),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Freeze Token Account", async () => {
    const freezeIx = await getFreezeTokenIx(
      {
        authority: setup.controllerAuthority.toString(),
        payer: setup.payer.toString(),
        owner: setup.user1.toString(),
        assetMint: mint,
      },
      rwaClient.provider
    );
    const data = freezeIx.data;
    const wrappedIx = await program.methods
      .freezeTokenAccount(data)
      .accountsStrict({
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        assetControllerProgram: assetControllerProgramId,
        assetMint: mint,
        assetController,
        tokenAccount: user1Ata,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(wrappedIx),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Thaw Token Account", async () => {
    const thawIx = await getThawTokenIx(
      {
        authority: setup.controllerAuthority.toString(),
        payer: setup.payer.toString(),
        owner: setup.user1.toString(),
        assetMint: mint,
      },
      rwaClient.provider
    );
    const data = thawIx.data;
    const wrappedIx = await program.methods
      .thawTokenAccount(data)
      .accountsStrict({
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        assetControllerProgram: assetControllerProgramId,
        assetMint: mint,
        assetController,
        tokenAccount: user1Ata,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(wrappedIx),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Revoke Tokens", async () => {
    const revokeIx = await getRevokeTokensIx(
      {
        owner: setup.user1.toString(),
        assetMint: mint,
        amount: 100,
        authority: setup.controllerAuthority.toString(),
      },
      rwaClient.provider
    );
    const data = revokeIx[0].data;
    const remainingAccounts = [
      {
        pubkey: getPolicyEnginePda(mint),
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: identityRegistryProgramId,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: getIdentityRegistryPda(mint),
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: getIdentityAccountPda(mint, assetController.toString()),
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: getTrackerAccountPda(mint, assetController.toString()),
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: getPolicyAccountPda(mint),
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: policyEngineProgramId,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: getExtraMetasListPda(mint),
        isWritable: false,
        isSigner: false,
      },
    ];
    const wrappedIx = await program.methods
      .revokeTokens(data)
      .accountsStrict({
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        assetControllerProgram: assetControllerProgramId,
        assetMint: mint,
        assetController,
        authorityTokenAccount: authorityAta,
        revokeTokenAccount: user1Ata,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    // ATA needs to be created separately as controller_pda cannot be payer.
    const createAtaIx = createAssociatedTokenAccountInstruction(
      setup.payer,
      authorityAta,
      assetController,
      new PublicKey(mint),
      TOKEN_2022_PROGRAM_ID
    );
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(...[createAtaIx, wrappedIx]),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Update Interest Bearing Mint Rate", async () => {
    const updateIx = await getUpdateInterestBearingMintRateIx(
      {
        authority: setup.controllerAuthority.toString(),
        assetMint: mint,
        payer: setup.payer.toString(),
        rate: 200,
      },
      rwaClient.provider
    );
    const data = updateIx.data;
    const wrappedIx = await program.methods
      .updateInterestBearingMintRate(data)
      .accountsStrict({
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        assetControllerProgram: assetControllerProgramId,
        assetMint: mint,
        assetController,
        eventAuthority,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(wrappedIx),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Create Policy Account", async () => {
    const { ixs } = await getCreatePolicyAccountIx(
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
      rwaClient.provider
    );
    const data = ixs[0].data;
    const ix = await program.methods
      .createPolicyAccount(data)
      .accountsStrict({
        payer: setup.payer,
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        policyEngine,
        policyAccount,
        policyEngineProgram: policyEngineProgramId,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(ix),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Attach to Policy Account", async () => {
    const policyArgs: AttachPolicyArgs = {
      payer: setup.controllerAuthority.toString(),
      assetMint: mint,
      authority: setup.authority.toString(),
      identityFilter: {
        identityLevels: [1],
        comparisionType: { or: {} },
      },
      policyType: {
        transactionAmountLimit: {
          limit: new BN(10000),
        },
      },
    };

    const policyIx = await rwaClient.policyEngine.attachPolicy(policyArgs);
    const data = policyIx.ixs[0].data;
    const wrappedIx = await program.methods
      .attachToPolicyAccount(data)
      .accountsStrict({
        payer: setup.payer,
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        policyEngineProgram: policyEngineProgramId,
        policyEngine,
        policyAccount,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(wrappedIx),
      [setup.payerKp, signer1]
    );
    const policyAccountData = await getPolicyAccount(mint, rwaClient.provider);
    assert.equal(policyAccountData.policies.length, 2);
  });

  it("CPI: Detach from Policy Account", async () => {
    let policyAccountData = await getPolicyAccount(mint, rwaClient.provider);

    for (const policy of policyAccountData?.policies ?? []) {
      const policyIx = await rwaClient.policyEngine.detachPolicy({
        authority: setup.controllerAuthority.toString(),
        owner: setup.user1.toString(),
        assetMint: mint,
        payer: setup.payer.toString(),
        hash: policy.hash,
      });
      const data = policyIx.ixs[0].data;
      const wrappedIx = await program.methods
        .detachFromPolicyAccount(data)
        .accountsStrict({
          payer: setup.payer,
          user: signer1.publicKey,
          controllerAuthority: setup.controllerAuthority,
          assetAccessController: setup.assetAccessController,
          authorizedUserRole: setup.userRole1,
          policyEngineProgram: policyEngineProgramId,
          policyEngine,
          policyAccount,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      await sendAndConfirmTransaction(
        rwaClient.provider.connection,
        new Transaction().add(wrappedIx),
        [setup.payerKp, signer1]
      );
    }
    policyAccountData = await getPolicyAccount(mint, rwaClient.provider);
    assert.equal(policyAccountData.policies.length, 0);
  });

  it("CPI: Create Identity Account", async () => {
    const identityAccountIx = await getCreateIdentityAccountIx(
      {
        payer: setup.payer.toString(),
        owner: setup.user1.toString(),
        assetMint: mint,
        level: 1,
        signer: setup.controllerAuthority.toString(),
      },
      rwaClient.provider
    );
    const data = identityAccountIx.data;
    const wrappedIx = await program.methods
      .createIdentityAccount(data)
      .accountsStrict({
        payer: setup.payer,
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry: getIdentityRegistryPda(mint),
        identityAccount: getIdentityAccountPda(mint, setup.user1),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(wrappedIx),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Add Level to Identity Account", async () => {
    const addLevelIx = await getAddLevelToIdentityAccount(
      {
        payer: setup.payer.toString(),
        owner: setup.user1.toString(),
        assetMint: mint,
        level: 2,
        signer: setup.controllerAuthority.toString(),
      },
      rwaClient.provider
    );
    const data = addLevelIx.data;
    const wrappedIx = await program.methods
      .addLevelToIdentityAccount(data)
      .accountsStrict({
        payer: setup.payer,
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry: getIdentityRegistryPda(mint),
        identityAccount: getIdentityAccountPda(mint, setup.user1),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(wrappedIx),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Remove Level from Identity Account", async () => {
    const removeLevelIx = await getRemoveLevelFromIdentityAccount(
      {
        payer: setup.payer.toString(),
        owner: setup.user1.toString(),
        assetMint: mint,
        level: 2,
        signer: setup.controllerAuthority.toString(),
      },
      rwaClient.provider
    );
    const data = removeLevelIx.data;
    const wrappedIx = await program.methods
      .removeLevelFromIdentityAccount(data)
      .accountsStrict({
        payer: setup.payer,
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry: getIdentityRegistryPda(mint),
        identityAccount: getIdentityAccountPda(mint, setup.user1),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(wrappedIx),
      [setup.payerKp, signer1]
    );
  });

  it("CPI: Revoke Identity Account", async () => {
    const identityProgram = getIdentityRegistryProgram(rwaClient.provider);
    const revokeIx = await identityProgram.methods
      .revokeIdentityAccount(setup.user1)
      .accountsStrict({
        payer: setup.payer.toString(),
        signer: setup.controllerAuthority.toString(),
        identityRegistry: getIdentityRegistryPda(mint),
        identityAccount: getIdentityAccountPda(mint, setup.user1),
      })
      .instruction();
    const data = revokeIx.data;
    const wrappedIx = await program.methods
      .revokeIdentityAccount(data)
      .accountsStrict({
        payer: setup.payer,
        user: signer1.publicKey,
        controllerAuthority: setup.controllerAuthority,
        assetAccessController: setup.assetAccessController,
        authorizedUserRole: setup.userRole1,
        identityRegistryProgram: identityRegistryProgramId,
        identityRegistry: getIdentityRegistryPda(mint),
        identityAccount: getIdentityAccountPda(mint, setup.user1),
      })
      .instruction();
    await sendAndConfirmTransaction(
      rwaClient.provider.connection,
      new Transaction().add(wrappedIx),
      [setup.payerKp, signer1]
    );
  });

  it("Create UserRole 2 successfully with authorized UserRole", async () => {
    const name = "Role2";
    const allowedAdminIxs = new BN(0);
    const allowedMediciIxs = new BN(0);

    await program.methods
      .createUserRole(name, allowedAdminIxs, allowedMediciIxs)
      .accountsStrict({
        payer,
        user: signer2.publicKey,
        newUserRole: setup.userRole2,
        authorizedUserRole: setup.userRole1,
        assetAccessController: setup.assetAccessController,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer2])
      .rpc();

    const userRoleAccount = await program.account.userRole.fetch(
      setup.userRole2
    );
    assert(
      userRoleAccount.assetAccessController.equals(setup.assetAccessController)
    );
    assert(userRoleAccount.id.eq(roleId2));
    assert.equal(userRoleAccount.name, name);
    assert(userRoleAccount.allowedAdminIxs.eq(allowedAdminIxs));
    assert(userRoleAccount.allowedMediciIxs.eq(allowedMediciIxs));
    assert.equal(userRoleAccount.users.length, 0);

    const controllerAccount = await program.account.assetAccessController.fetch(
      setup.assetAccessController
    );
    assert(controllerAccount.userRolesCount.eqn(2));
  });
});
