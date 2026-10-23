# Mainnet issuance-pruning reproduction

Pruning fixes the reproduced out-of-memory transfer failure for BUIDL mint
`GyWgeqpy5GueU2YbkE8xqUeVEokCMMCEeUrfbtMw6phr`. Upgrading the programs alone
still fails; explicitly pruning the affected tracker makes the identical transfer
transaction succeed. See [RESULTS.md](RESULTS.md) for the captured investor analysis
and measured results.

## Run

Use the repository's installed Node dependencies, Solana SBF build tools, Rust
toolchain, and Surfpool (tested with 1.5.0). From the repository root:

```sh
npm --prefix tests/mainnet-pruning test
```

The first run reads mainnet to inspect the investors and capture the fork fixture.
Later runs reuse `artifacts/` and run Surfpool offline. All transactions execute on
the local validator. The runner builds RBAC from the current source and installs
the candidate Policy Engine from `../../deps/policy_engine.so`.

To replace the fixture with current mainnet state:

```sh
MAINNET_RPC_URL=https://your-mainnet-rpc.example npm --prefix tests/mainnet-pruning run refresh
```

`MAINNET_RPC_URL` defaults to `https://api.mainnet-beta.solana.com`; the provider
must support filtered `getProgramAccounts`. `SURFPOOL_BIN` can specify a Surfpool
executable. `SURFPOOL_RPC_URL` can select a dedicated localhost port, for example
`http://127.0.0.1:18889`; the WebSocket port is the RPC port plus one. The default
RPC port is 18899. The runner refuses an already running validator and shuts down
its own process afterward.

Independent scripts are also available:

```sh
npm --prefix tests/mainnet-pruning run inspect
npm --prefix tests/mainnet-pruning run prepare
npm --prefix tests/mainnet-pruning run build
npm --prefix tests/mainnet-pruning run typecheck
```

Run `inspect` before `prepare`. All scripts are TypeScript. Build outputs, the
Cargo target directory, fork accounts, transaction evidence, and Surfpool logs
stay under this folder's ignored `artifacts/` directory. Preserve that directory
to share or replay the exact captured dataset. A fresh checkout captures current
mainnet instead; counts and eligibility can change. The count assertions identify
the requested 12-funded-investor scenario.

## What the six tests establish

1. The selected investor has the largest funded tracker, and its imported state
   matches the mainnet bytes. The original holding periods are both 86,400 seconds.
2. With the captured mainnet program binaries, an actual submitted transfer fails
   with `memory allocation failed, out of memory`; financial state rolls back.
3. Installing the updated Policy Engine and freshly compiled RBAC changes no
   financial account data, and the transfer still fails before pruning.
4. Pruning through the existing RBAC `ISSUE_TOKENS` member removes exactly the
   matured records. Active records, tracker total, locks, mint, token balances,
   policy, identities, tracker allocation, and tracker lamports are preserved.
5. The very same serialized transfer transaction now simulates and commits
   successfully. Both token balances and both tracker totals change by one base
   unit, while the mint remains unchanged.
6. Further pruning is a no-op. Restoring the original fork account state, with the
   updated programs still installed, reproduces the OOM again.

The fixture imports one funded investor and a pre-existing empty platform
recipient, plus their related accounts and program binaries. Other investors are
read for analysis but their trackers are not imported into Surfpool.

Surfpool runs with signature verification disabled so the original investor and
authorized pruning member can be impersonated without their private keys. The
programs still check their signer account metas, RBAC membership, PDAs, and policy
constraints. The only funded synthetic account is the local transaction fee payer.
The tests retain the default heap size and use a 1,400,000-unit compute limit to
separate heap exhaustion from compute exhaustion. They use the local clock and do
not shorten holding periods or edit issuance history to create the success case.

The root Anchor suite skips this opt-in suite. Importing any of these scripts does
not start a validator, contact mainnet, or build programs.

Generated evidence is in `artifacts/test-results.json`, with full failure logs,
simulation results, local transaction signatures, capture slot, and binary SHA-256
hashes. See the official [Surfpool cheatcode reference](https://solana.com/docs/tools/surfpool/rpc/cheatcodes)
for `surfnet_setAccount` and `surfnet_writeProgram`, which import the captured state
and replace the local program binaries.
