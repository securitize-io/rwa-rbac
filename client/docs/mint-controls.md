# Caps, throttling, and pending operations

Access these builders through `client.assetController.mintControls`. They return
unsigned instructions; applications submit transactions and arrange gate-authority
signatures through their existing governance workflow.

The new API uses the pinned token IDL because the published token SDK 0.4.3 does
not contain the APIs from token commit `b9935ce`. It encodes CPI data using that
IDL, following the existing RBAC SDK pattern. Rust external account layouts and
instruction discriminators live in `rbac-utils`; keep them and the SDK's generated
token interface in sync when updating the dependency.

## Permissions

| Instruction | Permission | External gate |
| --- | --- | --- |
| `setCapsConfigIx`, `setThrottleConfigIx` | `MANAGE_MINT_CONTROLS` | Required; V2 role |
| `migrateAssetControllerIx` | Master-role membership | Required; V2 role |
| Immediate/proposed mint and pending mint execution | `ISSUE_TOKENS` | None |
| Immediate/proposed burn and pending burn execution | `REVOKE_TOKENS` | None |
| `cancelPendingIx` | `CANCEL_PENDING_OPERATIONS` | None |
| `expirePendingIx` | Permissionless token-program cleanup | None |

Grant the new permission bits explicitly to existing roles, including masters.
Use `computeFlags(...)` to combine permissions: the cancellation bit occupies
bit 31 and ordinary JavaScript bitwise OR produces a signed number.

Execution requires a current authorized role. Any current issuer/burner may
execute the matching pending payload; the original proposer need not execute.
Revoking that proposer's membership does not cancel their pending requests.
Use the immediate cancellation permission for an emergency veto.

## Usage

```ts
const controls = client.assetController.mintControls;
const authorization = { assetMint, user, assetAccessController, authorizedUserRole };
const operationId = generateOperationId(); // Persist before submitting.
const propose = await controls.proposeMintIx({
  ...authorization,
  payer,
  wallet,
  request: { id: [...operationId], amount, issuanceTimestamp },
});
// Submit proposal, then observe effectiveAt and expiresAt:
const pending = await controls.getPendingOperation(assetMint, operationId);
const execute = await controls.executePendingIxs({ ...authorization, payer, operationId });
```

`executePendingIxs` derives accounts from the stored payload. It prepares a mint
ATA idempotently; burns use the existing saved source account. Wallet identities
are resolved through their current wallet link, including attached wallets.
`proposeBurnIx` accepts an optional `tokenAccount` and a reason of at most 256 UTF-8
bytes. `getPendingOperations` lists live accounts, including expired requests
awaiting cleanup.

Amounts are base units. Caps apply per instruction and cumulatively per window.
A zero individual cap is unlimited. Disabling throttling disables all cap checks
and accounting. Large mint **and burn** amounts share a threshold and delay;
amounts equal to the threshold execute immediately. Hard caps also apply to
delayed execution. Proposals reserve neither quota nor balance. Configuration
changes preserve consumption and do not change saved proposal timestamps.
Splitting amounts below the threshold avoids the delay but consumes window quota.

Operation IDs share one namespace per mint across mint and burn. Execute/cancel/
expiry closes the pending account and refunds the original payer. IDs can then
be reused: account absence is not permanent business-request deduplication.
Persist terminal token events before deciding to repropose an operation. RBAC's
`TokenOperationProposed`, `TokenOperationExecuted`, and `TokenOperationCancelled`
events additionally identify the human user and role; the token event's authority
and proposer identify RBAC's PDA.

## Token controller V1 to V2 rollout

This is separate from UserRole migration. The token controller retains its PDA,
discriminator, mint and authority. Its serialized layout grows from 73 to 162
bytes; either version may have trailing allocation padding. The upgraded token
program supports ordinary V1 issuance, revocation, freeze/thaw, seizure, metadata,
and memo operations while other assets use V2 controls. V1 operations preserve
the legacy layout and have no caps or throttling. Configuration and pending
operations require V2 and return `AssetControllerMigrationRequired` for V1.

`getAssetController` returns a discriminated V1/V2 union. Check
`account.version === 2` before reading caps, throttle, or consumption fields. The generated token
Anchor coder alone only describes V2; use this compatibility getter for mixed
assets. The migration planner uses the same getter and accepts padded V1 accounts.

1. Migrate governance roles to V2 and grant the new permission bits through the
   existing gated role administration workflow.
2. Deploy compatible token/RBAC programs and update clients. Old mint/burn
   instructions mark the controller read-only and need rebuilding with this SDK.
3. Migrate assets in off-chain batches as governance approves them. For each asset,
   call `migrateAndConfigureIxs({ ...authorization, payer, gateAuthority, caps, throttle })` and submit the returned instructions in
   **one** governance transaction. Migration initially disables controls, so do
   not expose an intervening unconfigured state. The planner skips completed
   migrations and unchanged settings and can resume an interrupted off-chain batch.
4. Verify configuration before resuming that asset's operational traffic. Other
   V1 assets remain available during this process, without the new controls.
   Configure new controllers before issuing too: they also start disabled.

No additional RBAC account layout or migration is introduced. The SDK does not
silently replace immediate issuance with a proposal or execute transactions.
