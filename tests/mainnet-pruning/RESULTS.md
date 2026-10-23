# Recorded reproduction: 23 October 2026

**Confirmed for the selected affected investor.** Six regression tests passed on
Surfpool 1.5.0 with RBAC rebuilt from commit
`79976819dcfdff4092f7353c76a7b67d7d96183b` and the commit's Policy Engine binary.
TypeScript type checking also passed.

The fork's financial accounts were captured at mainnet slot **460462077**,
2026-10-23 13:35:37 UTC (16:35:37 Europe/Kiev). Initial investor discovery was a
separate read, not an atomic historical snapshot of every mainnet account.

## Investor selection

The mint has **12 funded investors**, 14 registered investor identities, and one
platform identity. Two investor identities have zero tracker balance; the platform
also has zero balance. The twelve funded trackers inspected were:

| Investor owner | Issuances | Tracker bytes |
| --- | ---: | ---: |
| `6SBLHopw9jq2dvQ1w9SQ3EuEFGXtNb9RaUftnGfuCuE2` | **274** | **4473** |
| `9JQxEVdefSfyTWZxYYHiWUSiPnoNizQ2CQp6gUWdxCH` | 194 | 3193 |
| `GV5mCbKkb6MZA4a68Tihnm51s6bvs2vQK1Qm2CQQ4XT1` | 186 | 3065 |
| `BQdVwgEjRm1i2pJp5e4ToC8pcen8QpBHVvg2F7c5g9SP` | 184 | 3033 |
| `FM8x5ZaH9WXbUMyee2RAN5j4dKLxxLoPHDGASrNo8EAR` | 178 | 2937 |
| `6FMkTYX4Vc3ZLhGLr2MgetZSy3zHjEAfVRbDeYSR66sp` | 121 | 2025 |
| `4TRL8CU3Emm9Ske24rEisWaPY2pT1P6hPRjyH3ztaAhE` | 104 | 1753 |
| `8DQDVkEPAGd2BVXxXHneML9sXbCBznphmbygQLFSuqkN` | 87 | 1481 |
| `7tjQwAf51nmFjtd8uzzSeXQY3ULwjcsPBXnfbHD66cQ2` | 86 | 1465 |
| `ELw95PvfkPsXaS7PvzqEkiXzwbe92aAVxEyReHVMEb4h` | 84 | 1433 |
| `ABUtndeYjVeriQBvJqQqWw4pRNuvAUfhWN5itXWHjHfx` | 77 | 1321 |
| `5yq2kDpBVBnafUXUP5i7vwHtnevv8Da1UUTcEVax9RDA` | 28 | 537 |

The largest funded tracker was chosen and its transfer failure was reproduced.
The other eleven investors were inspected but not individually transfer-tested.

| Account | Address |
| --- | --- |
| Mint | `GyWgeqpy5GueU2YbkE8xqUeVEokCMMCEeUrfbtMw6phr` |
| Source wallet | `GNryy8K4fxyYqfeE5oZ4skfSi6tZSV1Cj8zt7jpBDtx7` |
| Source token account | `DiE1dJVhikWR74iagDQ2Cgb92Dk5V54jeJo44q8fjzwA` |
| Source identity | `D3iA3YWvFZoMdQ4vgZ8eQqJ88hQBtq5tDkC6zR4S3Am7` |
| Source tracker | `BV1nACp5mZR6NthYhWE9sq5gYGuQgoYtiSexUGp1yxDq` |
| Platform recipient | `BarF1zwxFb3SJTGcKMTStRA8NT1ARvk3VSgKkGhkpmru` |
| RBAC controller | `HdZ6bj1gDRLjNEvb2kjpsqzPxY3kRqJe8AaN7WU2QvyF` |
| Existing pruning role | `7yCKGAfyffuq6gu552xTSKWHW6SCqjTE2GGMTdSijvB8` |

## Observed behavior

| Programs and account state | Result | Compute units (simulation) |
| --- | --- | ---: |
| Captured mainnet programs; 274 issuances | OOM; submitted transaction fails and rolls back | 90478 |
| Updated Policy Engine + rebuilt RBAC; 274 issuances | Same OOM | 88604 |
| Explicit RBAC pruning | Success; removes 273 matured issuances | 56430 |
| Identical transfer after pruning; 1 issuance retained | Success in simulation and submitted transaction | 104606 |
| Updated programs; original unpruned state restored | OOM returns | — |

Both failing simulations include:

```text
Program log: Instruction: ExecuteTransaction
Program log: Error: memory allocation failed, out of memory
```

The retained issuance contains `10427850000` base units and has issue timestamp
`1792679658` (2026-10-22 14:34:18 UTC). Its 24-hour holding period had not expired
when the tests ran. Both US and non-US holding periods remained 86,400 seconds.
The tracker stayed **4473 bytes** after pruning, with unchanged lamports, locks,
and total balance. Pruning changed no token balances, mint supply, policies, or
identities. The successful transfer moved one base unit (`0.000001` BUIDL) and
updated both tracker totals accordingly.

This establishes that removing matured vector entries resolves this investor's
heap failure even while the allocated account size stays unchanged. Applying the
fix requires the updated Policy Engine and RBAC programs plus a pruning call for
the affected tracker; an upgrade alone left the failure in place. No production
programs or accounts were modified during verification.

## Candidate binary SHA-256

| Binary | SHA-256 |
| --- | --- |
| `deps/policy_engine.so` | `7f4f62582fc855ed27965d53a77f7f654dff8260bc378db6ce0fa7eda4f6a3e2` |
| Fresh RBAC build under this folder | `f64b90a5ca06bd4f26fda8eefb0cb332adfddb476fdec8f2528c67ff9746392c` |

Full captured data and machine-readable execution evidence remain locally in
`artifacts/`; they are ignored by Git. The recorded table above refers to that
dataset. Refreshing mainnet state or rerunning later can change the number of
eligible issuances as new records arrive and holding periods expire.
