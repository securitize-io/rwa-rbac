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
  createAssociatedTokenAccount,
} from "@solana/spl-token";

import { setupTests, sleep } from "./utils";
import { RwaRbacClient } from "../client/src/index";
import {
  CreateAssetControllerIx,
  getIdentityRegistryPda,
} from "../deps/rwa-token/clients/rwa-token-sdk/src";
import {
  AddTokenLockArgs,
  CreateOrCloseInvestorLocksArgs,
  RemoveTokenLockArgs,
} from "../client/src/types/instructions";
import {
  deriveInvestorLocks,
  deriveInvestorPda,
  deriveLockedTokenAccount,
} from "../client/src/pdas";

describe("Token Locks End to End Tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  let rwaRbacClient: RwaRbacClient;
  let setup;
  let mint: string;
  let connection: Connection;
  let investorLocksKey1: PublicKey;
  let lockedTokenAccount1: PublicKey;
  let unlockedTokenAccount1: PublicKey;
  let unlockedTokenAccount2: PublicKey;

  const INVESTOR_ID = "d1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
  const PLACEHOLDER_HASH1 = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
  const PLACEHOLDER_HASH2 = "b1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";

  const REASON_CODE1 = new BN(0);
  const REASON_CODE2 = new BN(45);

  const ISSUE_AMT1 = 1_000_000;
  const ISSUE_AMT2 = 2_000_000;

  before(async () => {
    setup = await setupTests();
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
    investorLocksKey1 = deriveInvestorLocks(
      INVESTOR_ID,
      getIdentityRegistryPda(mint)
    );

    // Create Investor
    const { ixs: createIxs } =
      await rwaRbacClient.identityMetadataRegistry.setupUserIxns(
        {
          payer: setup.payer.toString(), // Payer Account
          signer: setup.signer1.toString(), // RBAC Signer
          owner: setup.user1.toString(), // Investor Owner
          assetMint: mint,
          investorId: INVESTOR_ID,
          collisionHash: PLACEHOLDER_HASH2,
          levels: [1],
          expiries: [new BN(Date.now() / 1000 + 24 * 60 * 60)],
          proofHashes: [PLACEHOLDER_HASH1, PLACEHOLDER_HASH2],
          country: 1,
        },
        setup.assetAccessController
      );

    // Sending in separate transactions as workaround to an unexplained local websocket error.
    const tx1 = new Transaction().add(...createIxs);
    await sendAndConfirmTransaction(connection, tx1, [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    lockedTokenAccount1 = deriveLockedTokenAccount(
      INVESTOR_ID,
      getIdentityRegistryPda(mint)
    );
    unlockedTokenAccount1 = getAssociatedTokenAddressSync(
      new PublicKey(args.assetMint),
      setup.user1,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    unlockedTokenAccount2 = await createAssociatedTokenAccount(
      connection,
      setup.user2Kp,
      new PublicKey(args.assetMint),
      setup.user2,
      null,
      TOKEN_2022_PROGRAM_ID
    );
  });

  it("Create InvestorLocks succeeds for main owner", async () => {
    // Issue unlocked token to Investor's main wallet
    const issueTokenIxns = await rwaRbacClient.assetController.issueTokenIxns(
      {
        payer: setup.payer.toString(), // Payer Account
        signer: setup.signer1.toString(), // RBAC Signer
        owner: setup.user1.toString(), // Investor Owner
        assetMint: mint,
        amount: new BN(ISSUE_AMT1),
        investorId: INVESTOR_ID,
        wallet: setup.user1,
        issuanceTimestamp: new BN(Date.now() / 1000),
      },
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(...issueTokenIxns),
      [setup.payerKp, setup.signer1Kp]
    );

    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1, // Investor Owner
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock,
    };
    const ix = await rwaRbacClient.tokenLocks.createInvestorLocks(
      args,
      setup.assetAccessController
    );

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [setup.payerKp, setup.signer1Kp],
      { skipPreflight: true }
    );

    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert(
      investorLocks.investor.equals(
        deriveInvestorPda(INVESTOR_ID, getIdentityRegistryPda(mint))
      )
    );
    assert(investorLocks.wallet.equals(args.wallet));
    assert.equal(investorLocks.locks.length, 0);

    const lockedAccount = await rwaRbacClient.tokenLocks.fetchTokenAccount(
      deriveLockedTokenAccount(INVESTOR_ID, getIdentityRegistryPda(mint))
    );
    assert(lockedAccount.isFrozen);
    assert(lockedAccount.owner.equals(args.owner));
    assert(lockedAccount.mint.equals(new PublicKey(args.assetMint)));
    assert(lockedAccount.closeAuthority.equals(setup.controllerAuthority));
  });

  it("Fails to issue locked tokens with no reason string or code.", async () => {
    // Set lock up period.
    const issuancePoliciesArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      authority: setup.controllerAuthority.toString(), // ControllerAuthority
      assetMint: mint,
      issuancePolicies: {
        disallowBackdating: false,
        maxSupply: new BN(1000000),
        usLockPeriod: new BN(60),
        nonUsLockPeriod: new BN(30),
      },
    };
    const ix1 = await rwaRbacClient.policyEngine.changeIssuancePolicies(
      issuancePoliciesArgs,
      setup.signer1,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(ix1), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    try {
      // Expect error since reason code cannot be null.
      const issueTokenIxns = await rwaRbacClient.assetController.issueTokenIxns(
        {
          payer: setup.payer.toString(), // Payer Account
          signer: setup.signer1.toString(), // RBAC Signer
          owner: setup.user1.toString(), // Investor Owner
          assetMint: mint,
          amount: new BN(ISSUE_AMT1),
          investorId: INVESTOR_ID,
          wallet: setup.user1,
          issuanceTimestamp: new BN(Date.now() / 1000 - 10000), // Attempt to backdate
          reasonCode: null,
          reasonString: "x",
        },
        setup.assetAccessController
      );
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(...issueTokenIxns),
        [setup.payerKp, setup.signer1Kp]
      );
      assert(false);
    } catch (err) {
      assert(err.toString().includes("Missing reason or code"));
    }

    try {
      // Expect error since reason string cannot be null.
      const issueTokenIxns = await rwaRbacClient.assetController.issueTokenIxns(
        {
          payer: setup.payer.toString(), // Payer Account
          signer: setup.signer1.toString(), // RBAC Signer
          owner: setup.user1.toString(), // Investor Owner
          assetMint: mint,
          amount: new BN(ISSUE_AMT1),
          investorId: INVESTOR_ID,
          wallet: setup.user1,
          issuanceTimestamp: new BN(Date.now() / 1000 - 10000), // Attempt to backdate
          reasonCode: new BN(1),
          reasonString: null,
        },
        setup.assetAccessController
      );
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(...issueTokenIxns),
        [setup.payerKp, setup.signer1Kp]
      );
      assert(false);
    } catch (err) {
      assert(err.toString().includes("Missing reason or code"));
    }
  });

  it("Fails to issue locked tokens with backdating if release time is expired", async () => {
    // Issue unlocked token to Investor's main wallet
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(), // Investor Owner
      assetMint: mint,
      amount: new BN(ISSUE_AMT1),
      investorId: INVESTOR_ID,
      wallet: setup.user1,
      issuanceTimestamp: new BN(Date.now() / 1000 - 10000), // Attempt to backdate 10,000 seconds
      reasonCode: new BN(0),
      reasonString: "",
    };

    try {
      // Should fail to issue since release time (current time - 10,000s + 30s) is
      // less than current time.
      const issueTokenIxns = await rwaRbacClient.assetController.issueTokenIxns(
        args,
        setup.assetAccessController
      );
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(...issueTokenIxns),
        [setup.payerKp, setup.signer1Kp]
      );
      assert(false);
    } catch (err) {
      assert(err.toString().includes("InvalidReleaseTime."));
    }
  });

  it("Issue tokens with non-US lock period for main owner", async () => {
    const unlockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);
    const lockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(lockedTokenAccount1);

    // Issue unlocked token to Investor's main wallet
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(), // Investor Owner
      assetMint: mint,
      amount: new BN(ISSUE_AMT1),
      investorId: INVESTOR_ID,
      wallet: setup.user1,
      issuanceTimestamp: new BN(Date.now() / 1000),
      reasonCode: new BN(0),
      reasonString: "",
    };
    const issueTokenIxns = await rwaRbacClient.assetController.issueTokenIxns(
      args,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction()
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
        .add(...issueTokenIxns),
      [setup.payerKp, setup.signer1Kp]
    );

    // Check state of InvestorLocks.
    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert(
      investorLocks.investor.equals(
        deriveInvestorPda(INVESTOR_ID, getIdentityRegistryPda(mint))
      )
    );
    assert.equal(investorLocks.locks.length, 1);
    assert(investorLocks.locks[0].value.eqn(ISSUE_AMT1));
    assert(
      investorLocks.locks[0].releaseTime.eq(args.issuanceTimestamp.addn(30))
    );
    assert(investorLocks.locks[0].reasonCode.eq(args.reasonCode));
    assert.equal(investorLocks.locks[0].reasonString, args.reasonString);

    // Check token account balances.
    const lockedAccountAfter = await rwaRbacClient.tokenLocks.fetchTokenAccount(
      lockedTokenAccount1
    );
    assert.equal(
      Number(lockedAccountAfter.amount) - Number(lockedAccountBefore.amount),
      ISSUE_AMT1
    );
    const unlockedAccountAfter =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);
    assert.equal(
      Number(unlockedAccountBefore.amount) -
        Number(unlockedAccountAfter.amount),
      0
    );
  });

  it("Issue tokens with US lock period for main owner", async () => {
    // Set mapping for country 1 to US region (Level = 10).
    const changeMappingIx = await rwaRbacClient.policyEngine.changeMapping(
      {
        authority: setup.controllerAuthority,
        payer: setup.payer.toString(), // Payer Account
        assetMint: mint,
        mappingSource: [1],
        mappingValue: [11],
      },
      setup.signer1,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(changeMappingIx),
      [setup.payerKp, setup.signer1Kp]
    );

    const unlockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);
    const lockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(lockedTokenAccount1);

    // Issue unlocked token to Investor's main wallet
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(), // Investor Owner
      assetMint: mint,
      amount: new BN(ISSUE_AMT1),
      investorId: INVESTOR_ID,
      wallet: setup.user1,
      issuanceTimestamp: new BN(Date.now() / 1000),
      reasonCode: new BN(0),
      reasonString: "",
    };
    const issueTokenIxns = await rwaRbacClient.assetController.issueTokenIxns(
      args,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction()
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
        .add(...issueTokenIxns),
      [setup.payerKp, setup.signer1Kp]
    );

    // Check state of InvestorLocks.
    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert(
      investorLocks.investor.equals(
        deriveInvestorPda(INVESTOR_ID, getIdentityRegistryPda(mint))
      )
    );
    assert.equal(investorLocks.locks.length, 2);
    assert(investorLocks.locks[1].value.eqn(ISSUE_AMT1));
    // Expect US lock to be 60s.
    assert(
      investorLocks.locks[1].releaseTime.eq(args.issuanceTimestamp.addn(60))
    );
    assert(investorLocks.locks[1].reasonCode.eq(args.reasonCode));
    assert.equal(investorLocks.locks[1].reasonString, args.reasonString);

    // Check token account balances.
    const lockedAccountAfter = await rwaRbacClient.tokenLocks.fetchTokenAccount(
      lockedTokenAccount1
    );
    assert.equal(
      Number(lockedAccountAfter.amount) - Number(lockedAccountBefore.amount),
      ISSUE_AMT1
    );
    const unlockedAccountAfter =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);
    assert.equal(
      Number(unlockedAccountBefore.amount) -
        Number(unlockedAccountAfter.amount),
      0
    );
  });

  it("Close InvestorLocks for main owner", async () => {
    // Set lock up period to zero.
    const issuancePoliciesArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // User Account
      owner: setup.user1.toString(), // Target Account
      authority: setup.controllerAuthority.toString(), // ControllerAuthority
      assetMint: mint,
      issuancePolicies: {
        disallowBackdating: false,
        maxSupply: new BN(1000000),
        usLockPeriod: new BN(0),
        nonUsLockPeriod: new BN(0),
      },
    };
    const ix1 = await rwaRbacClient.policyEngine.changeIssuancePolicies(
      issuancePoliciesArgs,
      setup.signer1,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(ix1), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    const tx = new Transaction();

    // Remove all existing locks.
    for (let i = 0; i < investorLocks.locks.length; i++) {
      const args: RemoveTokenLockArgs = {
        signer: setup.signer1.toString(), // RBAC Signer
        owner: setup.user1.toString(),
        investorId: INVESTOR_ID,
        assetMint: mint,
        wallet: setup.user1, // Wallet to Lock
        index: new BN(0),
      };
      tx.add(
        await rwaRbacClient.tokenLocks.removeTokenLock(
          args,
          setup.assetAccessController
        )
      );
    }

    // Close InvestorLocks after removing all locks.
    const args: CreateOrCloseInvestorLocksArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(),
      investorId: INVESTOR_ID,
      assetMint: mint,
    };
    const closeIx = await rwaRbacClient.tokenLocks.closeInvestorLocks(
      args,
      setup.assetAccessController
    );
    tx.add(closeIx);
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 }));

    await sendAndConfirmTransaction(connection, tx, [
      setup.payerKp,
      setup.signer1Kp,
    ]);
    const investorLocksAcc = await connection.getAccountInfo(investorLocksKey1);
    assert.isNull(investorLocksAcc);
  });

  it("Create InvestorLocks for main owner again", async () => {
    // Create new InvestorLocks
    const args = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1, // Investor Owner
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock,
    };
    const ix = await rwaRbacClient.tokenLocks.createInvestorLocks(
      args,
      setup.assetAccessController
    );

    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [
      setup.payerKp,
      setup.signer1Kp,
    ]);

    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert(
      investorLocks.investor.equals(
        deriveInvestorPda(INVESTOR_ID, getIdentityRegistryPda(mint))
      )
    );
    assert(investorLocks.wallet.equals(args.wallet));
    assert.equal(investorLocks.locks.length, 0);

    const lockedAccount = await rwaRbacClient.tokenLocks.fetchTokenAccount(
      deriveLockedTokenAccount(INVESTOR_ID, getIdentityRegistryPda(mint))
    );
    assert(lockedAccount.isFrozen);
  });

  it("Fails to add lock when its expired", async () => {
    const args: AddTokenLockArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(),
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock
      value: new BN(100),
      releaseTime: new BN(Date.now() / 1000 - 100), // Lock has expired.
      reasonCode: REASON_CODE1,
      reasonString: "Locked",
    };

    const ix = await rwaRbacClient.tokenLocks.addTokenLock(
      args,
      setup.assetAccessController
    );

    try {
      // Expects to fail when an expired lock is provided.
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
          ix
        ),
        [setup.payerKp, setup.signer1Kp]
      );
      assert(false);
    } catch (err) {
      assert(err.toString().includes("InvalidReleaseTime."));
    }
  });

  it("Add lock for main owner", async () => {
    const args: AddTokenLockArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(),
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock
      value: new BN(100),
      releaseTime: new BN(Date.now() / 1000 + 6000), // Extended duration
      reasonCode: REASON_CODE1,
      reasonString: "Locked",
    };

    const unlockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);

    const ix = await rwaRbacClient.tokenLocks.addTokenLock(
      args,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ix
      ),
      [setup.payerKp, setup.signer1Kp]
    );

    const unlockedAccountAfter =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);
    const tokenChange =
      unlockedAccountBefore.amount - unlockedAccountAfter.amount;
    assert(args.value.eqn(Number(tokenChange)));
    assert(!unlockedAccountAfter.isFrozen);

    const lockedAccount = await rwaRbacClient.tokenLocks.fetchTokenAccount(
      lockedTokenAccount1
    );
    assert(args.value.eqn(Number(lockedAccount.amount)));
    assert(lockedAccount.isFrozen);

    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert(
      investorLocks.investor.equals(
        deriveInvestorPda(INVESTOR_ID, getIdentityRegistryPda(mint))
      )
    );
    assert(investorLocks.wallet.equals(args.wallet));
    assert(investorLocks.lockedTokenAccount.equals(lockedTokenAccount1));
    assert.equal(investorLocks.locks.length, 1);
    assert(investorLocks.locks[0].value.eq(args.value));
    assert(investorLocks.locks[0].releaseTime.eq(args.releaseTime));
    assert(investorLocks.locks[0].reasonCode.eq(args.reasonCode));
    assert.equal(investorLocks.locks[0].reasonString, args.reasonString);
  });

  it("Add second lock for main owner, with max reason string length", async () => {
    const args: AddTokenLockArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(),
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock
      value: new BN(200),
      releaseTime: new BN(Date.now() / 1000 + 3), // Release in 3 seconds, for expiry test
      reasonCode: REASON_CODE2,
      reasonString: "hello".repeat(42), // Maxing out allowed 1232 serialized transaction size
    };

    const ix = await rwaRbacClient.tokenLocks.addTokenLock(
      args,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ix
      ),
      [setup.payerKp, setup.signer1Kp]
    );

    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert.equal(investorLocks.locks.length, 2);
    assert(investorLocks.locks[1].value.eq(args.value));
    assert(investorLocks.locks[1].releaseTime.eq(args.releaseTime));
    assert(investorLocks.locks[1].reasonCode.eq(args.reasonCode));
    assert.equal(investorLocks.locks[1].reasonString, args.reasonString);
  });

  it("Remove lock for main owner, before expiry", async () => {
    const unlockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);
    const lockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(lockedTokenAccount1);

    const args: RemoveTokenLockArgs = {
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(),
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock
      index: new BN(0),
    };

    let investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    const lockedAmount = investorLocks.locks[0].value.toNumber();
    assert(Number(investorLocks.locks[0].releaseTime) > Date.now() / 1000);

    const ix = await rwaRbacClient.tokenLocks.removeTokenLock(
      args,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ix
      ),
      [setup.payerKp, setup.signer1Kp]
    );

    investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert(
      investorLocks.investor.equals(
        deriveInvestorPda(INVESTOR_ID, getIdentityRegistryPda(mint))
      )
    );
    assert(investorLocks.wallet.equals(args.wallet));
    assert(investorLocks.lockedTokenAccount.equals(lockedTokenAccount1));

    // Check that only first lock was removed.
    assert.equal(investorLocks.locks.length, 1);
    assert(investorLocks.locks[0].reasonCode.eq(REASON_CODE2));

    // Check token balance changes.
    const unlockedAccountAfter =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);
    assert.equal(
      Number(unlockedAccountAfter.amount - unlockedAccountBefore.amount),
      lockedAmount
    );
    assert(!unlockedAccountAfter.isFrozen);

    const lockedAccountAfter = await rwaRbacClient.tokenLocks.fetchTokenAccount(
      lockedTokenAccount1
    );
    assert.equal(
      Number(lockedAccountBefore.amount - lockedAccountAfter.amount),
      lockedAmount
    );
    assert(lockedAccountAfter.isFrozen);
  });

  it("Add lock after removal for main owner", async () => {
    const args: AddTokenLockArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(), // Investor Owner
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock
      value: new BN(200),
      releaseTime: new BN(Date.now() / 1000 + 30),
      reasonCode: REASON_CODE1,
      reasonString: "LockReason".repeat(10),
    };

    const unlockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);
    const lockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(lockedTokenAccount1);

    const ix = await rwaRbacClient.tokenLocks.addTokenLock(
      args,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ix
      ),
      [setup.payerKp, setup.signer1Kp]
    );

    const unlockedAccountAfter =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);
    const unlockedTokenChange =
      unlockedAccountBefore.amount - unlockedAccountAfter.amount;
    assert(args.value.eqn(Number(unlockedTokenChange)));
    assert(!unlockedAccountAfter.isFrozen);

    const lockedAccountAfter = await rwaRbacClient.tokenLocks.fetchTokenAccount(
      lockedTokenAccount1
    );
    const lockedTokenChange = Number(
      lockedAccountAfter.amount - lockedAccountBefore.amount
    );
    assert(args.value.eqn(lockedTokenChange));
    assert(lockedAccountAfter.isFrozen);

    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert(
      investorLocks.investor.equals(
        deriveInvestorPda(INVESTOR_ID, getIdentityRegistryPda(mint))
      )
    );
    assert(investorLocks.wallet.equals(args.wallet));
    assert(investorLocks.lockedTokenAccount.equals(lockedTokenAccount1));
    assert.equal(investorLocks.locks.length, 2);
    assert(investorLocks.locks[1].value.eq(args.value));
    assert(investorLocks.locks[1].releaseTime.eq(args.releaseTime));
    assert(investorLocks.locks[1].reasonCode.eq(args.reasonCode));
    assert.equal(investorLocks.locks[1].reasonString, args.reasonString);
  });

  it("Add lock for attached wallet", async () => {
    const attachWalletIx =
      await rwaRbacClient.identityRegistry.attachWalletToIdentityIxn(
        {
          payer: setup.payer.toString(), // Payer Account
          signer: setup.signer1.toString(), // RBAC Signer
          owner: setup.user1.toString(), // Investor Owner
          assetMint: mint,
          wallet: setup.user2,
        },
        setup.assetAccessController
      );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(attachWalletIx),
      [setup.payerKp, setup.signer1Kp]
    );

    // Issue token to Investor's attached wallet
    const issueTokenIxns2 = await rwaRbacClient.assetController.issueTokenIxns(
      {
        payer: setup.payer.toString(), // Payer Account
        signer: setup.signer1.toString(), // RBAC Signer
        owner: setup.user1.toString(), // Investor Owner
        assetMint: mint,
        amount: new BN(ISSUE_AMT2),
        wallet: setup.user2.toString(),
        investorId: INVESTOR_ID,
        issuanceTimestamp: new BN(Date.now() / 1000),
      },
      setup.assetAccessController,
      null
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(...issueTokenIxns2),
      [setup.payerKp, setup.signer1Kp]
    );

    const args: AddTokenLockArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(), // Investor Owner
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user2, // Wallet to Lock
      value: new BN(ISSUE_AMT2), // All tokens issued
      releaseTime: new BN(Date.now() / 1000 + 30),
      reasonCode: REASON_CODE2,
      reasonString: "Reason2".repeat(10),
    };

    const unlockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount2);
    const lockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(lockedTokenAccount1);

    const ix = await rwaRbacClient.tokenLocks.addTokenLock(
      args,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ix
      ),
      [setup.payerKp, setup.signer1Kp],
      {
        skipPreflight: true,
      }
    );

    const unlockedAccountAfter =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount2);
    const unlockedTokenChange =
      unlockedAccountBefore.amount - unlockedAccountAfter.amount;
    assert(args.value.eqn(Number(unlockedTokenChange)));
    assert(!unlockedAccountAfter.isFrozen);

    const lockedAccountAfter = await rwaRbacClient.tokenLocks.fetchTokenAccount(
      lockedTokenAccount1
    );
    const lockedTokenChange = Number(
      lockedAccountAfter.amount - lockedAccountBefore.amount
    );
    assert(args.value.eqn(lockedTokenChange));
    assert(lockedAccountAfter.isFrozen);

    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert(
      investorLocks.investor.equals(
        deriveInvestorPda(INVESTOR_ID, getIdentityRegistryPda(mint))
      )
    );
    assert(investorLocks.wallet.equals(setup.user1));
    assert(investorLocks.lockedTokenAccount.equals(lockedTokenAccount1));
    assert.equal(investorLocks.locks.length, 3);
    assert(investorLocks.locks[2].value.eq(args.value));
    assert(investorLocks.locks[2].releaseTime.eq(args.releaseTime));
    assert(investorLocks.locks[2].reasonCode.eq(args.reasonCode));
    assert.equal(investorLocks.locks[2].reasonString, args.reasonString);
  });

  it("Fails to remove lock with non-authorized signer before expiry", async () => {
    const args: RemoveTokenLockArgs = {
      signer: setup.user3.toString(), // Signer is not an AuthorizedUser
      owner: setup.user1.toString(), // Investor Owner
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user2, // Wallet to Lock
      index: new BN(2),
    };

    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );

    // Check that lock has not expired.
    assert(
      Number(investorLocks.locks[args.index.toNumber()].releaseTime) >
        Date.now() / 1000
    );

    const ix = await rwaRbacClient.tokenLocks.removeTokenLock(
      args,
      setup.assetAccessController
    );

    try {
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
          ix
        ),
        [setup.payerKp, setup.user3Kp]
      );
      assert(false);
    } catch (err) {
      assert(err.toString().includes("UnauthorizedUser."));
    }
  });

  it("Remove lock for attached wallet, before expiry", async () => {
    const args: RemoveTokenLockArgs = {
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(), // Investor Owner
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user2, // Wallet to Lock
      index: new BN(2),
    };

    let investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert(
      Number(investorLocks.locks[args.index.toNumber()].releaseTime) >
        Date.now() / 1000
    );

    const ix = await rwaRbacClient.tokenLocks.removeTokenLock(
      args,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ix
      ),
      [setup.payerKp, setup.signer1Kp],
      {
        skipPreflight: true,
      }
    );

    investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert(
      investorLocks.investor.equals(
        deriveInvestorPda(INVESTOR_ID, getIdentityRegistryPda(mint))
      )
    );
    assert(investorLocks.wallet.equals(setup.user1));
    assert(investorLocks.lockedTokenAccount.equals(lockedTokenAccount1));
    assert.equal(investorLocks.locks.length, 2);

    const unlockedAccountAfter =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount2);
    assert.equal(Number(unlockedAccountAfter.amount), ISSUE_AMT2); // Amount of token initially issued.
    assert(!unlockedAccountAfter.isFrozen);
  });

  it("Fails to remove lock with non-Investor signer, after expiry", async () => {
    const args: RemoveTokenLockArgs = {
      signer: setup.user3.toString(), // Signer is not an AuthorizedUser, nor the Investor Owner
      owner: setup.user1.toString(), // Investor Owner
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock
      index: new BN(0),
    };

    let investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );

    // Check that lock has expired.
    await sleep(3000);
    assert(
      Number(investorLocks.locks[args.index.toNumber()].releaseTime) <
        Date.now() / 1000
    );

    const ix = await rwaRbacClient.tokenLocks.removeTokenLock(
      args,
      setup.assetAccessController
    );

    try {
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
          ix
        ),
        [setup.payerKp, setup.user3Kp]
      );
      assert(false);
    } catch (err) {
      assert(err.toString().includes("UnauthorizedUser."));
    }
  });

  it("Remove lock with Investor signer for owner wallet, after expiry", async () => {
    const args: RemoveTokenLockArgs = {
      signer: setup.user1.toString(), // Signer is not an AuthorizedUser
      owner: setup.user1.toString(), // Investor Owner
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock
      index: new BN(0),
    };

    let investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    const lockedAmount = investorLocks.locks[0].value.toNumber();
    const unlockedAccountBefore =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);

    // Check that lock has expired.
    await sleep(3000);
    assert(Number(investorLocks.locks[0].releaseTime) < Date.now() / 1000);

    const ix = await rwaRbacClient.tokenLocks.removeTokenLock(
      args,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ix
      ),
      [setup.payerKp, setup.user1Kp]
    );

    investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert.equal(investorLocks.locks.length, 1); // Only 1 lock left

    const unlockedAccountAfter =
      await rwaRbacClient.tokenLocks.fetchTokenAccount(unlockedTokenAccount1);
    assert.equal(
      Number(unlockedAccountAfter.amount - unlockedAccountBefore.amount),
      lockedAmount
    );
    assert(!unlockedAccountAfter.isFrozen);
  });

  it("Add lock with indefinite expiry", async () => {
    const args: AddTokenLockArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(),
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock
      value: new BN(200),
      releaseTime: new BN(0), // Lock has indefinite expiry
      reasonCode: REASON_CODE1,
      reasonString: "hello",
    };

    const ix = await rwaRbacClient.tokenLocks.addTokenLock(
      args,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ix
      ),
      [setup.payerKp, setup.signer1Kp]
    );

    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert.equal(investorLocks.locks.length, 2);
    assert(investorLocks.locks[1].value.eq(args.value));
    assert(investorLocks.locks[1].releaseTime.eq(args.releaseTime));
    assert(investorLocks.locks[1].reasonCode.eq(args.reasonCode));
    assert.equal(investorLocks.locks[1].reasonString, args.reasonString);
  });

  it("Fails to remove lock with indefinite expiry with non-authorized signer", async () => {
    const args: RemoveTokenLockArgs = {
      signer: setup.user3.toString(), // Signer is not an AuthorizedUser
      owner: setup.user1.toString(), // Investor Owner
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock
      index: new BN(1),
    };

    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );

    // Check that lock has indefinite expiry.
    assert(Number(investorLocks.locks[args.index.toNumber()].releaseTime) == 0);

    const ix = await rwaRbacClient.tokenLocks.removeTokenLock(
      args,
      setup.assetAccessController
    );

    try {
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
          ix
        ),
        [setup.payerKp, setup.user3Kp]
      );
      assert(false);
    } catch (err) {
      assert(err.toString().includes("UnauthorizedUser."));
    }
  });

  it("Remove lock with indefinite expiry with authorized user", async () => {
    const args: RemoveTokenLockArgs = {
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(), // Investor Owner
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock
      index: new BN(1),
    };

    let investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );

    // Check that lock has indefinite expiry.
    assert(Number(investorLocks.locks[args.index.toNumber()].releaseTime) == 0);

    const ix = await rwaRbacClient.tokenLocks.removeTokenLock(
      args,
      setup.assetAccessController
    );

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ix
      ),
      [setup.payerKp, setup.signer1Kp]
    );

    investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert.equal(investorLocks.locks.length, 1);
  });

  it("Fails to close InvestorLocks with outstanding locks", async () => {
    const args: CreateOrCloseInvestorLocksArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(),
      investorId: INVESTOR_ID,
      assetMint: mint,
    };

    const investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert(investorLocks.locks.length > 0);

    const ix = await rwaRbacClient.tokenLocks.closeInvestorLocks(
      args,
      setup.assetAccessController
    );

    try {
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
          ix
        ),
        [setup.payerKp, setup.signer1Kp]
      );
      assert(false);
    } catch (err) {
      assert(err.toString().includes("RequireEqViolated"));
    }
  });

  it("Remove Last Lock", async () => {
    const args: RemoveTokenLockArgs = {
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(), // Investor Owner
      investorId: INVESTOR_ID,
      assetMint: mint,
      wallet: setup.user1, // Wallet to Lock
      index: new BN(0),
    };

    let investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );

    const ix = await rwaRbacClient.tokenLocks.removeTokenLock(
      args,
      setup.assetAccessController
    );

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ix
      ),
      [setup.payerKp, setup.signer1Kp]
    );

    investorLocks =
      await rwaRbacClient.tokenLocks.tokenLocksProgram.account.investorLocks.fetch(
        investorLocksKey1
      );
    assert.equal(investorLocks.locks.length, 0);
  });

  it("Close InvestorLocks for main owner", async () => {
    const args: CreateOrCloseInvestorLocksArgs = {
      payer: setup.payer.toString(), // Payer Account
      signer: setup.signer1.toString(), // RBAC Signer
      owner: setup.user1.toString(),
      investorId: INVESTOR_ID,
      assetMint: mint,
    };

    const ix = await rwaRbacClient.tokenLocks.closeInvestorLocks(
      args,
      setup.assetAccessController
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ix
      ),
      [setup.payerKp, setup.signer1Kp]
    );

    const investorLocksAcc = await connection.getAccountInfo(investorLocksKey1);
    assert.isNull(investorLocksAcc);
  });
});
