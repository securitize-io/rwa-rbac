# Permission gates using an external authority

**Status:** Implemented for the gated permissions listed in the repository README.

## Authorization boundary

RBAC classifies sensitive permissions in `GATED_ADMIN_FLAGS` and
`GATED_MEDICI_FLAGS`. A gated call requires:

1. A signing user assigned to the supplied role.
2. The appropriate permission in that role.
3. A configured external authority in `UserRole.gate_authority`.
4. A matching account with actual signer privilege.

New authorities must be PDAs derived under a program in `ALLOWED_GATING_PROGRAMS`,
initially Squads v4. No extra RBAC configuration account, operation enum, or
permission bit for admin rotation is introduced.

The external authority decides when to sign. It may use a timelock, a multisig,
a custom approval policy, or an immediate authorization. RBAC does not parse
Squads state or mandate delay, threshold, or member-count parameters. A missing
authority fails closed for gated calls.

## Permission-level policy

Permission flags determine both access and whether a gate is needed. Shared flags
protect every handler using them: `CHANGE_COUNTERS` covers both counter handlers,
and the assignment/removal flags gate both directions. There is no ungated
matching-flag exception and no controller-admin shortcut for any role permission.

Burn, seizure, freeze/thaw, and adding/removing token locks remain direct RBAC
operations. Country changes, level removal, normal onboarding, validated level
additions, and wallet attachment/detachment are also immediate. LUT updates and
investor/identity cleanup require permissions but no gate; cleanup still obeys
the downstream wallet and balance checks.

Raw identity creation remains gated because it can assign privileged initial
levels. The declared raw-level-addition and interest-rate-update flags are also
gated before their handlers are exposed. Metadata updates require a gate.
IMR is unchanged. Its special-level validation applies to additions, not initial
registration, so the latter remains a separate validation concern.

Issuance has no RBAC gate. Deploy this change only alongside verified token-native
mint caps and a delayed over-cap path covering every issuance route. RBAC does not
provide these protections or add a second delay. Burn and seizure are immediate
emergency operations. Rent withdrawal remains
gated because it transfers all controller-authority lamports to a caller-selected
receiver.

The external governance authorities implement Master, Roles, and Compliance delay
tiers through role configuration. RBAC checks signer provenance and permission;
it does not store or enforce delay seconds. Dedicated pause/unpause paths and
guards against generic policy-management bypasses are a separate integration.
See the repository README for the full gated set and operational tradeoffs.

## Governance configuration

The first role on a new controller is a master role with all permissions and a
configured authority. The current controller admin and proposed authority both
sign; the admin is assigned atomically. Subsequent role creation uses an existing
role's gated authorization. The initial bootstrap never reopens after roles have
been created.

An authority replacement or removal requires the target role's current authority
as well as the role authorizing the modification. This prevents a replacement
key from authorizing its own installation. Role-management permissions remain
powerful delegated authority and must be granted accordingly.

Setting an authority on creation or modification additionally requires a
`GateAuthorityProof` containing an allowed program ID and complete PDA seeds,
including the bump. RBAC derives the address, compares it to the proposed authority,
and requires the proposed authority to sign. Replacement therefore requires both
current and proposed authority consent. NoChange and Clear require no proof.
The proof is instruction data, not persistent state; `UserRole` stores only the
authority address. SDK builders expose it as `newGateAuthorityProof`.

`update_controller_admin` is intrinsically gated: the current admin must sign, be
a member of the controller's supplied master role, and obtain that role's authority
signature. No new flag is allocated.

All checks use current role state at execution. Revoking membership, removing a
permission, or rotating an authority may invalidate an outstanding proposal.
Program upgrade authority is outside this RBAC authorization boundary.

## Tests

`anchor test -- --features localnet` uses Anchor's default Surfpool validator.
The suites use the Squads SDK against the existing Squads program forked from
devnet. They test requests before and after release using Surfpool time travel,
including a real policy mutation and execution-time role/authority revocation.
There is no custom test program, fixture authority, or process launcher.

The timelock is a property of the selected authority, not an RBAC invariant.
Account-owner allowlisting is intentionally omitted: the Squads vault is not owned
by the Squads program, despite being derived and signed for by it. Supporting a
new gate program requires adding its ID to the compile-time allowlist. Callers
construct the program-specific seeds; RBAC does not parse them or verify that a
PDA represents a particular account type. The proof validates signing provenance,
not a timelock policy.

## Migration

Original deployed roles remain usable through the temporary V1 compatibility
codec. `migrate_user_role` converts one role in place and validates the authority
being installed. V2 roles enforce gates immediately; missing authorities do not
enable recovery bypasses. Governance groups and verifies every role for an asset
off-chain. No controller activation state is introduced. See the
[SDK migration guide](../../client/docs/migrations/user-roles-v2.md) for planning and cleanup.

Migration validates the incoming authority's derivation proof without requiring
its account or signature. Authorization through a V2 master still requires that
master's configured gate signer.

The allowlist applies at authority installation; removing a program from it does
not revoke already stored keys.
