# Medici Extensions

## Background

Medici is composed of 4 different programs: Asset Controller, Policy Engine, Identity Registry and Data Registry. Typically, an organization may create one or more assets representing a RWA they are intending to tokenize. An asset is created by invoking the CreateAssetController instruction which sets up a new token mint, AssetControllerAccount, PolicyEngine, IdentityRegistry and DataRegistry. These accounts and token mint will have an authority, a keypair held by the organization that can authorize instructions to mutate the state of these accounts. A secondary delegate signer can be assigned, with access to a smaller scope of instructions.

In addition, there are two new programs built to provide features beyond the scope of the initial Medici design. The Identity Metadata Registry (IMR), serves to store additional investor related metadata and sync levels to the related IdentityAccount, while the Token Locks (TL) program serves to perform the responsibility of managing and enforcing token locks for assets issued by the Medici RWA Token program,

## Identity Metadata Registry (IMR) Program

### Program Design

In RWA Token program, the intention is to utilize `level` as an enum, where each level (from 0 to 255) could represent either a user’s type and status or country. For example,

- 1 represents `KYC_APPROVED` type + `PENDING` status,
- 4 represents `ACCREDITED` type + `PENDING` status,
- 50 represents `US` country.

The client would first determine map the user’s attribute and country off-chain to a set of levels, alongside their expiry and proof hash (if they are attributes) . These levels would be push to the IMR, which would subsequently propagate it as levels to store it in `IdentityAccount` for policy enfocement.

In Identity Metadata Registry, there are two accounts `Investor` and `IdentityToInvestor`. `Investor` tracks the metadata associated to an `IdentityAccount` and `IdentityToInvestor` is used for reverse mapping from a wallet to the Investor account.

A user, after setting up an `AssetAccessController` and `AccessController` using the RBAC, would first invoke `RegisterInvestor` to create an Investor, IdentityToInvestor and IdentityAccount with the associated metadata and initial level, expiry and proof hash. Further levels can be added with `AddLevels` or removed with `RemoveLevels` instructions. Lastly, the accounts created can be removed with `RemoveInvestor`.

When a level is added, we perform the following validations:

- Check if a proof hash is valid (ascii string with <= 32 chars),
- Check that there are no duplicate levels
- Check that each attribute type appears only once (TBD)
- Check that each attribute status for a type appears only once (TBD)
- Check that there's only a maxiumum of one country (TBD)
- Maxiumum of only 5 levels

## Medici Role-Based Access Control (RBAC) Program

### Program Design

In Medici RBAC, we introduce `AssetAccessController` as the main data structure. The `AssetAccessController` has an `admin` authority and a `controller_authority` , a [program derived address](https://solana.com/docs/core/pda) that serves as the signer authority for all accounts governed by the `AssetAccessController`. This address is intentionally set to be different from the public key of `AssetAccessController`, as `rwa-token` program has instructions that require mutability access to the signer authority.

An organization using the RBAC will first create a `AssetAccessController` , generating a `controller_authority` address. The organization will then invoke `CreateAssetController` using `controller_authority` as the authority. All accounts created as part of that instruction will also share `controller_authority` as the authority, including the Policy Engine, Identity Registry and Token Mint.

The organization admin can then:

1. create one or more `UserRole` for the various groups of stakeholders that require access to manage the asset,
2. configure instructions that a `UserRole` is given access for and
3. assign or remove wallets from a `UserRole`.

Users can then invoke instructions through the RBAC program to perform the same tasks on Medici and IMR Program, such as adding or modifying a policy or freezing a token account, if they are in a UserRole with authorization to call the associated instruction.

### Design Considerations

- An organization with multiple assets to be governed under the same user roles can simply invoke `CreateAssetController` with the same `controller_authority` as the authority. Each user role will have the same level of access to each asset controlled.
  - For example, there are two assets, A and B owned by the `AssetAccessController`. A user role given access to `IssueTokens` ix will be able to call that and issue tokens for both A and B.
  - To have user roles with independent level of access for each asset, a new `AssetAccessController` should be created for each asset.
- Medici accounts associated (i.e. PolicyEngine, Token Mint, IdentityRegistry) to a `AssetAccessController` will be recorded and stored off-chain by the organization.
- We do not verify if a Medici account is intended to be owned by an `AssetAccessController` by its admin. We assume that if the Medici account is allowing `controller_authority` to be its admin, then the associated `AssetAccessController` should have full access to invoke instructions on it.
  - This implies that a third party could theoretically create an asset to be owned by the organization and governed under the user access rules of the associated `AssetAccessController`, without the admin’s involvement. Authorized users can then invoke instructions to manage this asset.

## Installation

1. Clone dependency with: `git submodule update --init --recursive`
2. Run `yarn install` in `deps/rwa-token/clients/rwa-token-sdk`
3. Run `yarn install` root directory.
4. Run `yarn install` in `/client` directory.

## Testing

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

Governance configuration remains in `UserRole.gate_authority`. RBAC verifies
signer privilege and equality with the configured key. The external authority
implements approvals, timelocks, cancellation, and any emergency policy; RBAC does
not parse Squads accounts or enforce a particular delay.

All admin flags except `SET_LUT_ADDRESS` are gated. The gated Medici flags are
`CHANGE_ISSUANCE_POLICIES`, `ATTACH_TO_POLICY_ACCOUNT`,
`DETACH_FROM_POLICY_ACCOUNT`, `CHANGE_COUNTER_LIMITS`, `CHANGE_COUNTERS`,
`CHANGE_MAPPING`, `ISSUE_TOKENS`, `SEIZE_TOKENS`, `REVOKE_TOKENS`,
`THAW_TOKEN_ACCOUNT`, `REMOVE_TOKEN_LOCK`, `CREATE_IDENTITY_ACCOUNT`,
`CHANGE_COUNTRY`, and `REMOVE_LEVELS`. Both `change_counters` and `set_counters`
use `CHANGE_COUNTERS`. Assignment and removal also share flags, so both require the
external authority. Freeze and add-lock operations retain their existing direct
role authorization.

LUT updates and investor/identity cleanup require role membership and their
permission but no gate signature. Cleanup remains subject to the token program's
one-remaining-wallet and zero-tracked-balance constraints. Removing a gate does
not introduce a controller-admin shortcut.

Direct identity creation can assign initial privileged levels; country changes
can shorten holding periods; removing levels can release an investor lock.
Their broad permissions therefore require a gate. Investor registration and
validated IMR level additions remain direct role operations. IMR is unchanged:
its existing special-wallet validation for level additions does not apply to
initial registration. Registration through
Squads exceeded the five-level CPI limit in the tested runtime while creating its
tracker account. Higher nesting depends on activation of
[SIMD-0268](https://solana.com/docs/core/cpi) on the target runtime.

Issuance and revocation retain their RBAC gates until token-native timelocks and
caps are implemented and verified on every relevant path, including forced burns.
Changing caps, delays, policy mappings, counters, or their limits must remain
protected. `WITHDRAW_EXCESS_RENT` also remains gated because it transfers all
controller-authority lamports to a caller-selected receiver.

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

This change updates instruction account lists and the SDK/IDL together. It does
not migrate legacy mainnet account layouts or configure existing role authorities.
Existing deployments need an explicit account migration and governance cutover
before activating these gates; missing authorities are not an admin recovery path.

### Gate authority provenance

Every authority installation, including bootstrap and replacement, checks the
instruction-only derivation proof against `ALLOWED_GATING_PROGRAMS` in
`programs/rwa-rbac/src/constants.rs`. The initial list contains the Squads v4
program. Extending the list requires a program upgrade. RBAC calls
`Pubkey::create_program_address` with the supplied seeds and program ID, requires
the result to match the proposed authority, and requires that authority to sign.
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
public key is persisted; the role layout and allocation remain unchanged.
Subsequent gated calls check the configured key and signer without a proof.
Existing authorities are not retroactively validated, and removing a program from
the allowlist does not revoke authorities already installed under it; these must
be handled explicitly during migration or authority rotation.

## Deployment

1. Prior to deployment on devnet or mainnet, the list of authorized signers allowed to create AssetAccessController should be updated in `programs/rwa-rbac/src/instructions/admin/create_controller.rs`.
2. Program should be compiled with `devnet` feature flag and without any feature flag for devnet and mainnet respectively.

## TypeScript Client

The TypeScript [Client](https://github.com/exo-tech-xyz/rwa-rbac/tree/main/client) can be installed with `yarn install @exo-tech-xyz/rwa-rbac` command. Refer to [integration tests](https://github.com/exo-tech-xyz/rwa-rbac/blob/main/tests/cpiTests.ts) for examples on how to initialize an `RwaRbacClient` and generate instructions for the program.

`RwaRbacClient` is intentionally designed to share the same interface as [`RwaClient`](https://github.com/bridgesplit/rwa-token/blob/main/clients/rwa-token-sdk/src/classes/Client.ts) whenever feasible, and is used as the entry point for interacting with the Medici RWA Token, and Investor Metadata Registry Programs.
