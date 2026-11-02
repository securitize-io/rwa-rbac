import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddressSync, getMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import {
  getIdentityAccountPda,
  getIdentityRegistryPda,
  getPolicyEnginePda,
  getTrackerAccount,
  getTrackerAccountPda,
  policyEngineProgramId,
} from "@dstoken-solana/rwa-token-sdk";
import { assert } from "chai";
import { AdminFlags, deriveInvestorPda, deriveUserRolePda, MediciFlags, RwaRbacClient } from "../client/src";
import { setupTests } from "./utils";

describe("RBAC prune issuances", () => {
  const DAY = 86400;
  const options = { commitment: "confirmed" as const, preflightCommitment: "confirmed" as const };
  let setup: Awaited<ReturnType<typeof setupTests>>;
  let client: RwaRbacClient;
  let mint: string;
  let owner: string;
  let pruningRole: PublicKey;
  let limitedRole: PublicKey;
  let tracker: PublicKey;

  const send = (ixs: TransactionInstruction[], signer = setup.signer1Kp) =>
    sendAndConfirmTransaction(setup.config.connection, new Transaction().add(...ixs), [setup.payerKp, signer], options);
  const prune = (role = pruningRole, signer = setup.signer2) =>
    client.policyEngine.pruneIssuances({ assetMint: mint, owner }, signer, setup.assetAccessController, role);
  const issue = async (timestamp: number) =>
    send(
      [
        await client.assetController.issueTokenIxns(
          {
            payer: setup.payer.toBase58(),
            signer: setup.signer2.toBase58(),
            assetMint: mint,
            investorId: "rbac-pruning",
            wallet: setup.user1.toBase58(),
            amount: new BN(7),
            issuanceTimestamp: new BN(timestamp),
          },
          setup.assetAccessController,
          pruningRole
        ),
      ],
      setup.signer2Kp
    );
  const changePolicies = (lockTime: number, maxSupply = 0) =>
    client.policyEngine.changeIssuancePolicies(
      {
        payer: setup.payer.toBase58(),
        authority: setup.controllerAuthority.toBase58(),
        assetMint: mint,
        issuancePolicies: {
          disallowBackdating: false,
          maxSupply: new BN(maxSupply),
          usLockPeriod: new BN(lockTime),
          nonUsLockPeriod: new BN(lockTime),
        },
      },
      setup.signer1,
      setup.assetAccessController,
      setup.userRole1
    );
  const balances = async () => {
    const connection = setup.config.connection;
    const wallet = getAssociatedTokenAddressSync(setup.assetMint, setup.user1, false, TOKEN_2022_PROGRAM_ID);
    return {
      wallet: (await getAccount(connection, wallet, "confirmed", TOKEN_2022_PROGRAM_ID)).amount,
      supply: (await getMint(connection, setup.assetMint, "confirmed", TOKEN_2022_PROGRAM_ID)).supply,
    };
  };
  const snapshot = async () =>
    (
      await setup.config.connection.getMultipleAccountsInfo(
        [
          tracker,
          new PublicKey(mint),
          getPolicyEnginePda(mint),
          getIdentityAccountPda(mint, owner),
          getAssociatedTokenAddressSync(new PublicKey(mint), setup.user1, false, TOKEN_2022_PROGRAM_ID),
        ],
        "confirmed"
      )
    ).map((account) => {
      assert.isNotNull(account);
      return { lamports: account.lamports, data: account.data.toString("base64") };
    });
  const expectRejected = async (ix: TransactionInstruction, error: string, signer = setup.signer2Kp) => {
    const before = await snapshot();
    try {
      await send([ix], signer);
      assert.fail("Expected pruning to be rejected");
    } catch (err) {
      assert.include(String(err), error);
    }
    assert.deepEqual(await snapshot(), before);
  };
  const policyCpiCount = async (signature: string) => {
    const tx = await setup.config.connection.getTransaction(signature, { commitment: "confirmed" });
    assert.isNull(tx.meta.err);
    return tx.meta.innerInstructions
      .flatMap((group) => group.instructions)
      .filter((ix) => tx.transaction.message.accountKeys[ix.programIdIndex].equals(policyEngineProgramId)).length;
  };

  before(async () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    setup = await setupTests();
    const provider = anchor.AnchorProvider.env();
    provider.opts.commitment = "confirmed";
    provider.opts.preflightCommitment = "confirmed";
    client = new RwaRbacClient(setup.config, provider);
    mint = setup.assetMint.toBase58();
    owner = deriveInvestorPda("rbac-pruning", getIdentityRegistryPda(mint)).toBase58();
    tracker = getTrackerAccountPda(mint, owner);
    const create = await client.createAssetAccessControllerIxn({
      payer: setup.payer,
      admin: setup.signer1,
      assetMint: setup.assetMint,
      decimals: 0,
      name: "RBAC Pruning",
      symbol: "PRUNE",
      uri: "https://example.com/prune.json",
    });
    await sendAndConfirmTransaction(
      setup.config.connection,
      new Transaction().add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }), create),
      [setup.payerKp, setup.signer1Kp, setup.assetMintKp],
      options
    );

    for (const [index, flags, user] of [
      [1, MediciFlags.ALL, setup.signer1],
      [2, MediciFlags.ISSUE_TOKENS, setup.signer2],
      [3, MediciFlags.ADD_TOKEN_LOCK, setup.signer2],
    ] as const) {
      const role = deriveUserRolePda(new BN(index), setup.assetAccessController);
      await send([
        await client.createUserRoleIxn({
          payer: setup.payer,
          user: setup.signer1,
          assetAccessController: setup.assetAccessController,
          name: `Pruning role ${index}`,
          allowedAdminIxs: AdminFlags.NONE,
          allowedMediciIxs: flags,
        }),
        await client.assignUserRoleIxn({
          payer: setup.payer,
          user: setup.signer1,
          assetAccessController: setup.assetAccessController,
          userRole: role,
          usersToAssign: [user],
        }),
      ]);
    }
    pruningRole = deriveUserRolePda(new BN(2), setup.assetAccessController);
    limitedRole = deriveUserRolePda(new BN(3), setup.assetAccessController);

    const investor = await client.identityMetadataRegistry.setupUserIxns(
      {
        payer: setup.payer.toBase58(),
        signer: setup.signer1.toBase58(),
        assetMint: mint,
        investorId: "rbac-pruning",
        collisionHash: "proof",
        levels: [1],
        expiries: [new BN(2 ** 40)],
        proofHashes: ["proof"],
        country: 236,
      },
      setup.assetAccessController,
      setup.userRole1
    );
    await send(investor.ixs);
    await send([
      await client.identityRegistry.attachWalletToIdentityIxn(
        {
          payer: setup.payer.toBase58(),
          signer: setup.signer1.toBase58(),
          assetMint: mint,
          owner,
          wallet: setup.user1.toBase58(),
        },
        setup.assetAccessController,
        setup.userRole1
      ),
    ]);
    await send([
      await client.policyEngine.changeIssuancePolicies(
        {
          payer: setup.payer.toBase58(),
          authority: setup.controllerAuthority.toBase58(),
          assetMint: mint,
          issuancePolicies: {
            disallowBackdating: false,
            maxSupply: new BN(0),
            usLockPeriod: new BN(4 * DAY),
            nonUsLockPeriod: new BN(4 * DAY),
          },
        },
        setup.signer1,
        setup.assetAccessController,
        setup.userRole1
      ),
    ]);
    await send([
      await client.policyEngine.changeMapping(
        {
          payer: setup.payer.toBase58(),
          authority: setup.controllerAuthority.toBase58(),
          assetMint: mint,
          mappingSource: [236],
          mappingValue: [11],
        },
        setup.signer1,
        setup.assetAccessController,
        setup.userRole1
      ),
    ]);
    const now = await setup.config.connection.getBlockTime(await setup.config.connection.getSlot("confirmed"));
    assert.isNotNull(now);
    for (const timestamp of [now - DAY / 4, now - 3 * DAY, now + DAY, now - 1.5 * DAY]) {
      await send([
        await client.assetController.issueTokenIxns(
          {
            payer: setup.payer.toBase58(),
            signer: setup.signer1.toBase58(),
            assetMint: mint,
            investorId: "rbac-pruning",
            wallet: setup.user1.toBase58(),
            amount: new BN(10),
            issuanceTimestamp: new BN(timestamp),
          },
          setup.assetAccessController,
          setup.userRole1
        ),
      ]);
    }
    await send([
      await client.policyEngine.addLock(
        {
          payer: setup.payer.toBase58(),
          authority: setup.controllerAuthority.toBase58(),
          assetMint: mint,
          owner,
          amount: new BN(1),
          lockTime: new BN(0),
          reason: new BN(1),
          reasonString: "Independent lock",
        },
        setup.signer1,
        setup.assetAccessController,
        setup.userRole1
      ),
    ]);
    // Keep all seed records locked during issuance, then shorten the periods
    // so manual pruning still has matured history to remove.
    await send([
      await client.policyEngine.changeIssuancePolicies(
        {
          payer: setup.payer.toBase58(),
          authority: setup.controllerAuthority.toBase58(),
          assetMint: mint,
          issuancePolicies: {
            disallowBackdating: false,
            maxSupply: new BN(0),
            usLockPeriod: new BN(2 * DAY),
            nonUsLockPeriod: new BN(DAY),
          },
        },
        setup.signer1,
        setup.assetAccessController,
        setup.userRole1
      ),
    ]);
  });

  it("rejects a member without the pruning permission", async () => {
    await expectRejected(await prune(limitedRole), "InvalidUserRole");
  });

  it("requires membership even for the controller admin", async () => {
    await expectRejected(await prune(pruningRole, setup.signer1), "InvalidUserRole", setup.signer1Kp);
  });

  it("rejects a substituted Policy Engine program", async () => {
    const ix = await prune();
    ix.keys.find((key) => key.pubkey.equals(policyEngineProgramId)).pubkey = SystemProgram.programId;
    await expectRejected(ix, "ConstraintAddress");
  });

  it("binds the operation to the controller's mint", async () => {
    const ix = await prune();
    ix.keys.find((key) => key.pubkey.equals(setup.assetMint)).pubkey = setup.user2;
    await expectRejected(ix, "ConstraintHasOne");
  });

  it("rejects a tracker for a different identity", async () => {
    const otherOwner = setup.user2.toBase58();
    const identity = await client.identityRegistry.setupUserIxns(
      {
        payer: setup.payer.toBase58(),
        signer: setup.signer1.toBase58(),
        assetMint: mint,
        owner: otherOwner,
        levels: [1],
        expiry: [new BN(2 ** 40)],
        country: 236,
      },
      setup.assetAccessController,
      setup.userRole1
    );
    await send(identity.ixs);
    const ix = await prune();
    ix.keys.find((key) => key.pubkey.equals(tracker)).pubkey = getTrackerAccountPda(mint, otherOwner);
    await expectRejected(ix, "ConstraintSeeds");
  });

  it("prunes with ISSUE_TOKENS and preserves financial state and allocation", async () => {
    const ix = await prune();
    assert.deepEqual(
      ix.keys.filter((key) => key.isWritable).map((key) => key.pubkey.toBase58()),
      [tracker.toBase58()]
    );
    assert.equal(MediciFlags.ISSUE_TOKENS, 1 << 3);
    assert.equal(MediciFlags.ALL, (1 << 30) - 1);
    const before = await getTrackerAccount(mint, owner, client.provider);
    const accountsBefore = await snapshot();
    assert.lengthOf(before.issuances, 4);
    const signature = await send([ix], setup.signer2Kp);
    const after = await getTrackerAccount(mint, owner, client.provider);
    assert.deepEqual(after, { ...before, issuances: [0, 2, 3].map((index) => before.issuances[index]) });
    const accountsAfter = await snapshot();
    assert.deepEqual(accountsAfter.slice(1), accountsBefore.slice(1));
    assert.equal(accountsAfter[0].lamports, accountsBefore[0].lamports);
    assert.equal(accountsAfter[0].data.length, accountsBefore[0].data.length);
    // One RBAC -> Policy Engine call plus the Policy Engine's event self-CPI.
    assert.equal(await policyCpiCount(signature), 2);
    const noOp = await send([await prune()], setup.signer2Kp);
    assert.equal(await policyCpiCount(noOp), 1);
    assert.deepEqual(await snapshot(), accountsAfter);
  });

  it("uses the current country mapping on later calls", async () => {
    await send([
      await client.policyEngine.changeMapping(
        {
          payer: setup.payer.toBase58(),
          authority: setup.controllerAuthority.toBase58(),
          assetMint: mint,
          mappingSource: [236],
          mappingValue: [0],
        },
        setup.signer1,
        setup.assetAccessController,
        setup.userRole1
      ),
    ]);
    const before = await getTrackerAccount(mint, owner, client.provider);
    await send([await prune()], setup.signer2Kp);
    const after = await getTrackerAccount(mint, owner, client.provider);
    assert.deepEqual(after, { ...before, issuances: before.issuances.slice(0, 2) });
  });

  it("automatically prunes on issuance and reuses existing tracker allocation", async () => {
    await send([await changePolicies(0)]);
    const now = await setup.config.connection.getBlockTime(await setup.config.connection.getSlot("confirmed"));
    const timestamp = now + 2 * DAY;
    const before = await getTrackerAccount(mint, owner, client.provider);
    const accountsBefore = await snapshot();
    const balancesBefore = await balances();
    assert.lengthOf(before.issuances, 2);
    // ISSUE_TOKENS alone authorizes both issuance and explicit pruning.
    await issue(timestamp);
    const after = await getTrackerAccount(mint, owner, client.provider);
    assert.deepEqual({ ...after, totalAmount: before.totalAmount, issuances: before.issuances }, before);
    assert.isTrue(after.totalAmount.eq(before.totalAmount.addn(7)));
    // Compare BN values rather than internal backing-array allocations.
    assert.deepEqual(
      after.issuances.map((record) => ({ amount: record.amount.toString(), issueTime: record.issueTime.toString() })),
      [
        { amount: before.issuances[1].amount.toString(), issueTime: before.issuances[1].issueTime.toString() },
        { amount: "7", issueTime: String(timestamp) },
      ]
    );
    const accountsAfter = await snapshot();
    assert.equal(accountsAfter[0].lamports, accountsBefore[0].lamports);
    assert.equal(accountsAfter[0].data.length, accountsBefore[0].data.length);
    assert.deepEqual(accountsAfter.slice(2, 4), accountsBefore.slice(2, 4));
    const balancesAfter = await balances();
    assert.equal(balancesAfter.wallet.toString(), (balancesBefore.wallet + BigInt(7)).toString());
    assert.equal(balancesAfter.supply.toString(), (balancesBefore.supply + BigInt(7)).toString());
  });

  it("does not retain already matured new issuances or grow the tracker", async () => {
    const now = await setup.config.connection.getBlockTime(await setup.config.connection.getSlot("confirmed"));
    const before = await getTrackerAccount(mint, owner, client.provider);
    const accountsBefore = await snapshot();
    await issue(now - 2 * DAY);
    const after = await getTrackerAccount(mint, owner, client.provider);
    assert.deepEqual({ ...after, totalAmount: before.totalAmount }, before);
    assert.isTrue(after.totalAmount.eq(before.totalAmount.addn(7)));
    const accountsAfter = await snapshot();
    assert.equal(accountsAfter[0].lamports, accountsBefore[0].lamports);
    assert.equal(accountsAfter[0].data.length, accountsBefore[0].data.length);
  });

  it("rolls back automatic pruning and minting when an issuance policy rejects the transaction", async () => {
    const now = await setup.config.connection.getBlockTime(await setup.config.connection.getSlot("confirmed"));
    await send([await changePolicies(DAY)]);
    await issue(now);
    // The current-time record becomes eligible for pruning, but the failing
    // issuance must restore it along with the token balance and mint supply.
    await send([await changePolicies(0, 1)]);
    assert.lengthOf((await getTrackerAccount(mint, owner, client.provider)).issuances, 3);
    const before = await snapshot();
    const balancesBefore = await balances();
    try {
      await issue(now);
      assert.fail("Expected issuance above the supply limit to be rejected");
    } catch (err) {
      assert.include(String(err), "MaxSupply");
    }
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual(await balances(), balancesBefore);
  });
});
