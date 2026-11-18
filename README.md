# DSToken Role-Based Access Control (RBAC)

## Background

DSToken on Solana is built on top of an extended fork of the RWA Standard, a set of on-chain programs used to issue and manage regulated real-world assets. The core protocol consists of multiple programs that together provide token lifecycle management, identity-based compliance enforcement, and policy configuration.

In the DSToken architecture, **all privileged operations are governed programmatically through role-based access control**, rather than through externally owned authority keypairs. The `rwa-rbac` project implements this access control layer and serves as the primary authority interface for all DSToken-related programs.

The RBAC program works in conjunction with the following on-chain components:

- Asset Controller Program (ACP)
- Policy Engine Program (PEP)
- Identity Registry Program (IRP)
- Identity Metadata Registry Program (IMR)

For each DSToken deployment (per mint), RBAC is configured as the **sole effective authority** controlling token issuance, transfers, compliance configuration, and administrative actions.

---

## Programs Overview

This repository contains two Solana programs:

- **Role-Based Access Control (RBAC) Program**
- **Identity Metadata Registry (IMR) Program**

These programs extend the RWA Standard to support DSToken-specific access control, investor metadata management, and parity with the Ethereum-based DSToken protocol.

---

## Role-Based Access Control (RBAC) Program

### Program Design

The RBAC program introduces the **AssetAccessController** as its core configuration account.

An `AssetAccessController` is created per DSToken deployment (per mint) and defines:

- An **admin authority**, responsible for configuring roles
- A **controller authority**, implemented as a **program-derived address (PDA)**

The controller authority PDA acts as the **signer authority** for all governed programs and accounts, including:

- Token-2022 mint
- Asset Controller account
- Policy Engine account
- Identity Registry account

This design intentionally separates the configuration authority (admin) from the operational signer (PDA), enabling programmatic enforcement of permissions and eliminating reliance on externally owned authority keys.

---

### Roles and Permissions

RBAC allows the creation of arbitrary **user roles**, each configured with fine-grained instruction-level permissions using feature flags.

In the context of DSToken, the protocol is typically initialized with the following expected roles:

- **MASTER**
- **ISSUER**
- **EXCHANGE**
- **TRANSFER_AGENT**

Each role defines which instructions it is authorized to execute across the governed programs. Wallets can be assigned to or removed from roles dynamically.

All privileged interactions with ACP, PEP, IRP, and IMR must be performed **through the RBAC program**, which enforces:

1. Role membership validation  
2. Feature-flag authorization  
3. Instruction discriminator matching  
4. CPI execution using the controller authority PDA as signer  

---

### CPI Instruction Model

The RBAC program exposes a set of CPI wrapper instructions that mirror administrative and operational instructions in the underlying programs.

Each CPI follows the same execution pattern:

1. Validate the caller’s role and permissions  
2. Validate instruction data  
3. Invoke the underlying program using the controller authority PDA  

This ensures that **all authority checks are centralized and auditable**, and that no privileged instruction can be executed without RBAC approval.

---

### Design Considerations

- **Per-token isolation**  
  Each DSToken deployment has its own `AssetAccessController`, roles, and permissions. Roles do not implicitly apply across different tokens unless explicitly configured.

- **No ownership verification**  
  RBAC does not independently verify that a governed account is intended to be managed by a given `AssetAccessController`. If a program or account accepts the controller authority PDA as its authority, RBAC assumes it is valid.

- **Programmatic governance**  
  All effective control is exercised via PDAs and role checks. No individual wallet directly holds mint, freeze, or compliance authority.

---

## Identity Metadata Registry (IMR) Program

### Program Design

The Identity Metadata Registry extends the Identity Registry Program by storing **investor-specific metadata** that is not required during transfer execution but is needed for compliance and auditability.

IMR maintains this data separately to avoid bloating accounts used in transfer hooks and policy enforcement.

---

### Accounts

- **Investor Account**  
  Stores investor metadata such as identifiers, proof hashes, country, and attribute levels.

- **Identity Mapping**  
  Provides a mapping between wallets and their associated investor identity, enabling multiple wallets to be linked to a single investor.

---

### Workflow

1. An authorized RBAC role registers a new investor using `register_investor`
2. An IdentityAccount is created in the Identity Registry
3. Metadata and initial levels are stored in IMR
4. Levels are synchronized to the Identity Registry for policy enforcement
5. Additional wallets may be attached or removed
6. Levels may be added or removed over time
7. Investors may be fully removed when no longer active

All IMR instructions validate authority through the Identity Registry and RBAC.

---

### Level Validation

When adding levels, the IMR enforces the following constraints:

- Proof hashes must be valid ASCII strings (≤ 32 characters)
- No duplicate levels
- Maximum of one country level
- Maximum of one attribute per type
- Maximum number of levels per investor
- Attribute status consistency

Levels are ultimately propagated to the Identity Registry and used by the Policy Engine during transfer validation.

---

## Installation

```bash
git submodule update --init --recursive
```

### Install dependencies:

### RWA Token SDK
cd deps/rwa-token/clients/rwa-token-sdk
yarn install

### Root
cd ../../../..
yarn install

### Client
cd client
yarn install

## Testing

Integration tests are located in `tests/`.

Integration tests use Surfpool's local account and clock cheatcodes.

Use the project's pinned Anchor 1.1.2 toolchain:

```sh
anchor test -- --features localnet
```

Anchor starts Surfpool by default, loads the RBAC/IMR programs and checked-in
Medici binaries, runs the TypeScript suites, and stops the validator.
`yarn test:surfpool` is an alias for this command; there is no custom launcher or test
program. The test configuration forks the existing Squads program and its program
configuration from devnet, so the first run requires RPC access.

The tests share helpers in `tests/utils.ts`, use the Squads SDK to create, approve,
and execute vault transactions, and use `surfnet_timeTravel` to advance past a
configured delay. Generated local addresses are marked with `surfnet_offlineAccount`
to avoid unnecessary devnet lookups and rate limits. Surfpool account injection is limited to isolated RBAC fixtures
and deliberate changes used to test execution-time authorization. The CPI suite
uses actual downstream asset, investor, token, and policy state.

## External authority gates

These rules apply to V2 roles. Legacy roles retain their existing authorization
until explicitly converted, as described in the [SDK migration guide](client/docs/migrations/user-roles-v2.md).

Governance configuration remains in `UserRole.gate_authority`. RBAC verifies
signer privilege and equality with the configured key. The external authority
implements approvals, timelocks, cancellation, and any emergency policy; RBAC does
not parse Squads accounts or enforce a particular delay.

All admin flags except `SET_LUT_ADDRESS` are gated. The exposed gated Medici
permissions are `UPDATE_ASSET_METADATA`, `CHANGE_ISSUANCE_POLICIES`,
`ATTACH_TO_POLICY_ACCOUNT`, `DETACH_FROM_POLICY_ACCOUNT`, `CHANGE_COUNTER_LIMITS`,
`CHANGE_COUNTERS`, `CHANGE_MAPPING`, and `CREATE_IDENTITY_ACCOUNT`.
Both `change_counters` and `set_counters` use `CHANGE_COUNTERS`. Assignment and
removal also share flags, so both require the external authority. The declared
`UPDATE_INTEREST_BEARING_MINT_RATE` and `ADD_LEVEL_TO_IDENTITY_ACCOUNT` permissions
are gated in preparation for future handlers.

Issuance, burn, seizure, freeze/thaw, adding/removing token locks, country changes, and
level removal execute through role permissions without an additional gate.
LUT updates, wallet attachment/detachment, and investor/identity cleanup are also
direct role operations. Cleanup still obeys downstream wallet and balance checks.
A configured authority on the role does not delay these immediate operations.

Raw identity creation can assign privileged levels and remains a gated exception.
Investor registration and validated IMR level additions remain direct. IMR is
unchanged: its validation of level additions does not apply to initial
registration. Initial special-level handling therefore remains a separate
validation concern. Registration through Squads exceeded the five-level CPI limit
in the tested runtime while creating its tracker account. Higher nesting depends
on activation of [SIMD-0268](https://solana.com/docs/core/cpi) on the target runtime.

Deployment prerequisite: deploy this ungated issuance path only alongside a token
program that enforces mint caps and the delayed over-cap path on every issuance
route. RBAC does not enforce these limits. Ordinary within-cap issuance is direct;
over-cap issuance must follow the token's native delay without another RBAC delay.
Burn and seizure remain immediate emergency operations. Rent withdrawal stays
gated because it transfers all controller-authority lamports to a caller-selected
receiver.

Gate delays are configured on the external authorities: Master governance covers
metadata, role definitions, counter overrides, rent withdrawal, and admin rotation;
Roles governance covers membership changes; Compliance governance covers ordinary
policy changes, counter limits, and country mappings. RBAC does not enforce the
48-hour or 24-hour delays. Configure role permissions and gate authorities
accordingly. Dedicated immediate pause and Master-gated unpause paths, including
guards on generic policy attachment/detachment, are a separate integration.

Gated calls require the role user, its permission, and `gateAuthority` as an actual
signer. There is no controller-admin bypass. Medici SDK builders accept
`gateAuthority` as a final optional parameter, and admin builders accept it in
their argument object. Creation/modification use `newGateAuthority` for the value
to store, separately from the signing `gateAuthority`. When setting that value,
provide `newGateAuthorityProof: { programId, seeds }`, with the complete PDA seeds
including the bump. The proposed authority is also a required signer, distinct
from any existing gate approvals. Omitting the signer for a
gated call fails closed. Ungated builders do not accept a `gateAuthority` argument.

`update_controller_admin` is always gated without a new permission bit: it requires
the current controller admin, membership in the supplied controller's master role,
and that role's authority. Add the incoming admin to the master role if it should
be able to perform a subsequent admin rotation. The existing ability to void the
controller admin remains available when a master role exists.

Changing or clearing an existing role authority also requires the target role's
current authority, in addition to authorization through a role with
`MODIFY_USER_ROLE`. The SDK's `currentGateAuthority` defaults to `gateAuthority`;
provide it explicitly when the authorizing and target roles use different keys.
Authorization is evaluated against the role state at execution time.

### First-role bootstrap

For a newly created controller, the first role must be a master role with all
admin and Medici permissions, a configured authority, and signatures from both
the controller admin and that authority. Creation assigns the admin to the role
atomically. Subsequent role creation and assignment use normal gated permissions.
The bootstrap path is unavailable after any role has been created. A master role
is reserved at creation, including before any later user assignment.

This change updates instruction account lists and the SDK/IDL together. Original
mainnet roles remain usable until explicitly converted with `migrate_user_role`.
Each conversion preserves the role PDA, users, and permissions and installs its
validated gate authority. V2 roles enforce gates immediately; new roles always use
V2. Controllers and IMR require no migration. Group conversions by controller and
verify every role off-chain before resuming the asset's administrative activity.
See the [SDK migration guide](client/docs/migrations/user-roles-v2.md) for compatibility reads, resumable
instruction plans, authorization, and removal of legacy support after rollout.

### Gate authority provenance

Every authority installation, including bootstrap and replacement, checks the
instruction-only derivation proof against `ALLOWED_GATING_PROGRAMS` in
`programs/rwa-rbac/src/constants.rs`. The initial list contains the Squads v4
program. Extending the list requires a program upgrade. RBAC calls
`Pubkey::create_program_address` with the supplied seeds and program ID, requires
the result to match the proposed authority. Role creation and authority updates
also require the proposed authority to sign. Migration relies on existing
controller/master governance and validates the incoming proof without requiring
the incoming authority's account or signature.
Ordinary keypair authorities, unapproved programs, malformed seeds, and mismatched
addresses are rejected. A role may still be created without an authority;
gated operations then fail closed until a proven authority is installed.

For Squads, the proof seeds are `"multisig"`, the multisig address bytes,
`"vault"`, the one-byte vault index, and the one-byte bump returned by the SDK's
`getVaultPda`. The multisig account need not be passed to RBAC or stored in the
role. A rotation between different vaults requires both authorities' signatures;
the tests demonstrate nested Squads executions for this approval flow.

The proof is generic: RBAC does not interpret seeds, deserialize Squads accounts,
or verify a specific vault type or timelock configuration. Account ownership is
not checked because a standard Squads vault is not owned by Squads. Only the gate
public key is persisted; the derivation proof adds no persistent fields.
Subsequent gated calls check the configured key and signer without a proof.
Existing authorities are not retroactively validated, and removing a program from
the allowlist does not revoke authorities already installed under it; these must
be handled explicitly during migration or authority rotation.

## Deployment

Before deploying to devnet or mainnet:

Update the list of authorized signers allowed to create AssetAccessController in
programs/rwa-rbac/src/instructions/admin/create_controller.rs

Compile with:

devnet feature flag for devnet

No feature flag for mainnet

## TypeScript Client

A TypeScript client is provided for interacting with the RBAC and IMR programs.

Install via:
```
yarn install @securitize/rwa-rbac
```

The RwaRbacClient is designed to align closely with the DSToken and RWA Token SDK interfaces and acts as the primary entry point for:

- Role configuration
- Investor registration
- Compliance administration
- Token lifecycle operations

Refer to the integration tests for end-to-end usage examples.
