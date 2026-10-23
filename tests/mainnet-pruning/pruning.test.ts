import { strict as assert } from 'assert';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { getPolicyEngineAccount } from '@dstoken-solana/rwa-token-sdk';
import { Harness, load } from './harness';
import { save } from './inspect';

// The repository's regular Anchor suite discovers tests/**/*.ts. Opt in only
// through this folder's runner; importing the scripts performs no work.
const suite = process.env.RUN_MAINNET_PRUNING === '1' ? describe : describe.skip;
suite('mainnet BUIDL issuance pruning on Surfpool', function () {
  this.timeout(120000);
  let h: Harness;
  let unchangedTransfer: VersionedTransaction;
  let beforePrune: Awaited<ReturnType<Harness['snapshot']>>;
  let originalTracker: NonNullable<Awaited<ReturnType<Harness['tracker']>>>;
  const evidence: Record<string, any> = {};
  const assertOom = (result: { err: unknown; logs?: string[] | null; logMessages?: string[] | null }) => {
    assert.deepEqual(result.err, { InstructionError: [1, 'ProgramFailedToComplete'] });
    assert.match((result.logs || result.logMessages || []).join('\n'), /memory allocation failed, out of memory/);
  };
  const issuanceValues = (records: any[]) =>
    records.map((r) => ({ amount: r.amount.toString(), issueTime: r.issueTime.toString() }));

  before(async () => {
    h = new Harness();
    await h.reset();
    evidence.mainnetProgramHashes = await h.installMainnet();
    evidence.fixture = {
      mint: h.manifest.mint,
      slot: h.manifest.slot,
      capturedAt: h.manifest.capturedAt,
      sourceOwner: h.manifest.source.owner,
      sourceWallet: h.manifest.source.wallet,
      sourceTracker: h.manifest.source.tracker,
      destinationWallet: h.manifest.destination.wallet,
    };
  });
  after(() => save('test-results.json', evidence));

  it('forks the largest funded tracker from the 12 investors without modifying its data', async () => {
    assert.equal(h.manifest.investorCount, 12);
    assert.equal(h.manifest.registeredInvestorCount, 14);
    assert.equal(h.manifest.identityCount, 15);
    const investors = load('investors.json');
    const source = h.manifest.source;
    assert.equal(
      source.issuanceCount,
      Math.max(
        ...investors
          .filter((i: any) => BigInt(`0x${i.trackerState.total_amount}`) > 0n)
          .map((i: any) => i.issuanceCount)
      )
    );
    for (const [address, account] of Object.entries(await h.snapshot())) {
      assert.deepEqual(account, {
        data: h.accounts[address].data[0],
        lamports: h.accounts[address].lamports,
        owner: h.accounts[address].owner,
      });
    }
    originalTracker = (await h.tracker())!;
    assert.equal(originalTracker.issuances.length, source.issuanceCount);
    assert(originalTracker.totalAmount.gtn(0));
    const policy = await getPolicyEngineAccount(h.manifest.mint, h.provider);
    assert.equal(policy!.issuancePolicies.usLockPeriod.toNumber(), 86400);
    assert.equal(policy!.issuancePolicies.nonUsLockPeriod.toNumber(), 86400);
    evidence.issuancesBefore = originalTracker.issuances.length;
  });

  it('reproduces a committed mainnet-program transfer failure with out-of-memory logs and rollback', async () => {
    const before = await h.snapshot();
    const transaction = await h.transfer();
    const simulation = await h.simulate(transaction);
    assertOom(simulation);
    const result = await h.submit(transaction);
    assertOom(result.meta);
    assert.deepEqual(await h.snapshot(), before);
    evidence.mainnetFailure = { ...result, simulation };
  });

  it('still fails after upgrading the programs while keeping issuance history intact', async () => {
    beforePrune = await h.snapshot();
    evidence.candidateProgramHashes = await h.installCandidate();
    assert.deepEqual(await h.snapshot(), beforePrune);
    unchangedTransfer = await h.transfer();
    const result = await h.simulate(unchangedTransfer);
    assertOom(result);
    evidence.candidateBeforePruning = result;
  });

  it('prunes through the existing ISSUE_TOKENS role and preserves active records, balances, locks, allocation and rent', async () => {
    const timeBefore = await h.clock();
    const simulation = await h.simulate(await h.prune());
    assert.equal(simulation.err, null, simulation.logs?.join('\n'));
    const signature = await h.execute(await h.prune());
    const timeAfter = await h.clock();
    const after = await h.tracker();
    // Require no maturity boundary during this assertion, so retained records
    // are known exactly from unchanged on-chain holding periods.
    const active = (time: number) => originalTracker.issuances.filter((r) => r.issueTime.toNumber() + 86400 > time);
    assert.deepEqual(issuanceValues(active(timeBefore)), issuanceValues(active(timeAfter)));
    assert.deepEqual(issuanceValues(after!.issuances), issuanceValues(active(timeAfter)));
    assert(after!.issuances.length < originalTracker.issuances.length);
    assert.deepEqual({ ...after, issuances: [] }, { ...originalTracker, issuances: [] });
    const snapshotAfter = await h.snapshot();
    const tracker = h.manifest.source.tracker;
    for (const [address, account] of Object.entries(beforePrune)) {
      if (address !== tracker) assert.deepEqual(snapshotAfter[address], account, `Pruning changed ${address}`);
    }
    assert.equal(snapshotAfter[tracker].lamports, beforePrune[tracker].lamports);
    assert.equal(
      Buffer.from(snapshotAfter[tracker].data, 'base64').length,
      Buffer.from(beforePrune[tracker].data, 'base64').length
    );
    evidence.pruning = {
      signature,
      simulation,
      timeBefore,
      timeAfter,
      removed: originalTracker.issuances.length - after!.issuances.length,
      retained: issuanceValues(after!.issuances),
      trackerBytes: Buffer.from(snapshotAfter[tracker].data, 'base64').length,
    };
  });

  it('makes the identical transfer transaction succeed and updates both wallets and trackers', async () => {
    const before = await h.snapshot();
    const result = await h.simulate(unchangedTransfer);
    assert.equal(result.err, null, result.logs?.join('\n'));
    const signature = await h.execute(unchangedTransfer);
    const after = await h.snapshot();
    const { source, destination, mint } = h.manifest;
    const amount = (snapshot: typeof before, address: string, offset: number) =>
      Buffer.from(snapshot[address].data, 'base64').readBigUInt64LE(offset);
    assert.equal(amount(after, source.tokenAccount, 64), amount(before, source.tokenAccount, 64) - 1n);
    assert.equal(amount(after, destination.tokenAccount, 64), amount(before, destination.tokenAccount, 64) + 1n);
    assert.equal(amount(after, source.tracker, 73), amount(before, source.tracker, 73) - 1n);
    assert.equal(amount(after, destination.tracker, 73), amount(before, destination.tracker, 73) + 1n);
    assert.deepEqual(after[mint], before[mint]);
    evidence.transferAfterPruning = { signature, simulation: result, amountInBaseUnits: '1' };
  });

  it('is idempotent and fails again if the original unpruned fork state is restored', async () => {
    const before = await h.snapshot();
    await h.execute(await h.prune());
    assert.deepEqual(await h.snapshot(), before);
    await h.reset();
    assertOom(await h.simulate(await h.transfer()));
    evidence.restoringOriginalHistoryReproducesOom = true;
  });
});
