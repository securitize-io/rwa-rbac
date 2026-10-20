# Timelock gating design decision

**Status:** Proposed  
**Decision:** Use code-defined operation gating as the mandatory security floor.
Role configuration may add protection, but must not make a code-gated operation direct.

## Context

The RBAC program will protect multiple sensitive operations with a Squads multisig and
timelock. Two designs were considered:

1. **Compile-time gating:** the program contains a static set of operation flags that
   always require the role user and a Squads vault signer.
2. **Config-time gating:** administrators create dedicated roles for selected operations
   and configure a Squads authority only on those roles.

“Compile-time” here means a policy encoded in the deployed program, such as
`GATED_ADMIN_FLAGS` and `GATED_MEDICI_FLAGS`. It is a code-level invariant, not a Rust
type-system proof, and it can still change through a program upgrade.

This decision assumes an on-chain Squads parser will validate the official Squads program,
multisig account, vault PDA, and required multisig configuration. The comparison therefore
does not treat an arbitrary keypair as an acceptable `multisigAuthority`.

## Decision summary

Use **compile-time operation gating** for every operation whose security specification says
that a timelock is mandatory. Do not use role-configured gating as the only enforcement
mechanism for such operations.

```text
Operation is classified as gated by program code
                         |
                         v
Role user signature + permission check
                         |
                         v
Validated Squads multisig and vault signer
                         |
                         v
Squads threshold and timelock have been satisfied
                         |
                         v
Operation may execute
```

Configuration still determines the authorized users, role permissions, Squads multisig,
members, threshold, and delay, subject to the program's validation rules. It can also require
Squads for additional operations. It cannot remove the minimum protection encoded for a
mandatory operation.

## Comparison

| Property | Compile-time operation gating | Config-time role gating |
| --- | --- | --- |
| Protected object | The operation | A particular role |
| Security statement | “This operation always requires Squads” | “Calls authorized through this role require Squads” |
| Alternate-role bypass | Prevented | Possible unless every eligible role is configured correctly |
| Failure mode | Missing configuration fails closed | Missing or incorrect configuration can silently weaken policy |
| Auditability | Inspect the program and gated flag sets | Enumerate every live role and its mutation history |
| Flexibility | Requires an upgrade to change the mandatory set | Can change without a program upgrade |
| Per-controller customization | Limited for mandatory gates | Natural |
| Configuration attack surface | Smaller | Larger |
| Best use | Protocol security invariants | Optional additional controls |

## Why operation gating is safer

### The caller must not choose the security policy

Solana instructions receive their accounts from the caller. If authorization depends only on
the supplied `UserRole`, a caller can select any other role that contains the requested
permission. One unprotected duplicate role is enough to bypass the intended timelock.

With operation gating, the instruction determines the required security level before looking
at the role. All roles capable of authorizing that operation are subject to the same minimum.

### Misconfiguration fails closed

For a mandatory operation, a missing role, missing Squads configuration, invalid vault, weak
multisig configuration, or missing signature must reject execution. A newly created role must
not accidentally create a direct path.

### The invariant is locally auditable

An auditor can inspect each handler and the gated flag constants to determine which operations
require Squads. With role-only gating, the answer depends on all existing on-chain role
accounts and can change after the audit.

### Policy remains stable across proposal execution

Squads proposals are approved at one point and executed later. Authorization must use current
on-chain state at execution so revocation remains effective, but the minimum security class of
the operation should not change merely because a different role was supplied. Code-defined
gating provides that stable floor.

## Why config-time role gating is not sufficient

Role-level configuration is useful, but it protects a role rather than an operation. Used as
the sole mechanism, it introduces several downgrade paths:

- Create a new role with the sensitive permission and no Squads authority.
- Add the permission to an existing direct-execution role.
- Change the authority to a weaker multisig configuration.
- Supply another eligible role when executing the instruction.
- Accidentally omit protection during deployment or migration.

These risks can be reduced by heavily governing role changes, but doing so recreates an
operation policy indirectly and remains harder to audit.

If runtime selection of mandatory operations ever becomes a product requirement, prefer an
**operation-policy account** keyed by controller and operation flag. Do not infer the policy
from the caller-selected role. Policy changes must themselves use delayed governance, be
observable, and fail closed when the policy account is absent.

## Recommended authorization model

For each instruction, determine one exact operation permission and then apply:

```text
requires_squads = code_requires_squads(operation)
                OR config_adds_squads(operation)
```

Configuration is monotonic: it may strengthen the effective policy, never weaken the
code-defined minimum.

Avoid ambiguous “any of these flags” checks that combine gated and ungated permissions. Each
handler should normally request one precise operation flag. If an instruction intentionally
accepts several permissions, its gate must be derived from the selected authorization path and
covered by explicit downgrade tests.

## Squads validation requirements

The planned parser should validate the Squads relationship at every gated execution, not only
when the role is configured. At minimum it should verify:

- The expected, pinned Squads program ID.
- Squads ownership and the expected account discriminator/layout.
- The canonical multisig PDA and vault PDA, including the vault index.
- That the signing vault is the vault configured on the role or operation policy.
- A nonzero, policy-compliant timelock and a policy-compliant threshold.
- Member count, permissions, and any project-specific governance constraints.
- The current multisig configuration, because authorization state can change over time.
- Safe treatment of `config_authority`; an uncontrolled multisig or an equivalently governed
  configuration authority is preferable to a hot configuration key.

Threshold and member-count checks cannot prove that keys are held by independent people or
devices. Operational key separation, monitoring, and incident response remain necessary.

## Solana-specific design rules

This model fits Solana's execution model when the following rules are enforced:

- Treat every account as caller-controlled input. Validate owners, discriminators, PDA seeds,
  canonical bumps, and relationships between the controller, role, multisig, and vault.
- Require both authorities as actual signer accounts. Signer privilege propagates through CPI,
  while only the program used to derive a PDA can sign for it with `invoke_signed`.
- Pin the accepted Squads program ID. Account data that merely resembles a Squads account is
  not sufficient.
- Revalidate current policy during execution. Client-side validation and validation performed
  only when a role is created are not security boundaries.
- Keep failure atomic: perform every authorization and Squads check before mutating protocol
  state.
- Budget the additional Squads account parsing and PDA derivations in compute-unit tests.

See Solana's documentation for the runtime guarantees around
[PDAs](https://solana.com/docs/core/pda) and
[cross-program invocation](https://solana.com/docs/core/cpi).

## Protect the policy-management path

The protected execution path is only as strong as the accounts that configure it. The same or
stronger authorization should apply to actions that can create a bypass, including:

- Creating a role with a gated permission.
- Adding a gated permission to a role.
- Assigning users who can exercise a gated permission.
- Changing or clearing the Squads authority.
- Changing any operation-policy account.
- Reducing accepted Squads thresholds or timelock minimums.

Revocation and emergency cancellation may use separate rules because they reduce authority,
but those rules should be explicit rather than inferred from a generic role-modification
instruction.

The RWA RBAC program's upgrade authority is also part of the security boundary. A program
upgrade can change the compiled gated set, so production deployments should place the upgrade
authority behind suitably strong, delayed governance or make the program immutable when that
is operationally acceptable. Solana documents both transferring and permanently removing the
[program upgrade authority](https://solana.com/docs/programs/deploying#transfer-program-authority).

## Industry precedent

Established governance designs generally make the protected authority path unavoidable while
allowing governance parameters to remain configurable:

- [OpenZeppelin TimelockController](https://docs.openzeppelin.com/contracts/5.x/access-control#delayed_operation)
  becomes the controlled contract's owner. Its own delay changes go through the timelock,
  preventing a direct owner path from bypassing scheduled execution.
- [Compound governance](https://github.com/compound-finance/compound-protocol)
  queues successful governance proposals through its timelock before they can affect protocol
  contracts.
- [SPL Governance](https://github.com/solana-labs/solana-program-library/tree/master/governance)
  uses a governance PDA as authority and executes proposal instructions only after their
  configured hold-up time.
- [OpenZeppelin AccessManager](https://docs.openzeppelin.com/contracts/5.x/access-control#using-accessmanager)
  supports configurable roles and execution delays, but assigns authorization to a target
  contract plus function selector. This is operation-centric configuration, not policy chosen
  solely by presenting a role.
- [Squads v4](https://github.com/Squads-Protocol/v4) provides the PDA vault, threshold,
  permissions, and timelock machinery. Its documentation also warns that a compromised
  configuration authority can reduce thresholds or change members, which is why configuration
  governance must be included in the threat model.

This pattern is the important precedent: **critical calls have one enforced governance path;
parameters inside that path may be configurable, but a caller cannot choose a weaker path.**

## Consequences

### Benefits

- Mandatory operations cannot be downgraded by creating or selecting another role.
- The policy is explicit, deterministic, and straightforward to audit and test.
- Squads configuration remains flexible across controllers without weakening the minimum.
- Additional operations can opt into protection through configuration.

### Costs

- Changing the mandatory gated set requires a reviewed program upgrade.
- New sensitive operations must be classified correctly during development.
- The Squads parser adds accounts, compute cost, version coupling, and migration work.
- Policy-management instructions require additional design and tests.

These costs are appropriate for an on-chain authorization boundary. Flexibility should be
introduced above the mandatory security floor, not instead of it.

## Required tests

For every gated operation, tests should prove that execution fails when:

- Only the controller admin signs.
- Only the role user signs.
- A role without the required permission is supplied.
- A different role with the same permission but no valid Squads configuration is supplied.
- The second signer is an ordinary keypair or a vault from another multisig.
- The Squads account owner, PDA derivation, threshold, or timelock is invalid.
- The proposal is approved but the timelock has not expired.
- The role or Squads configuration changes before proposal execution.

Tests should also prove that the same approved proposal succeeds after the delay when all
current authorization and Squads invariants hold.

## Final choice

Choose **compile-time operation gating** for the mandatory set of protected operations.
Use configuration for identities and acceptable Squads parameters, and optionally to add
protection elsewhere. Do not make mandatory security depend exclusively on specially created
roles.
