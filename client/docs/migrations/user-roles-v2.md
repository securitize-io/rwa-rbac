# User roles: V1 to V2 migration

`RwaRbacClient.userRoles` contains the temporary V1/V2 reads and migration tooling.
The SDK builds instructions; the application supplies signing, timelock approvals,
transaction batching, and submission. No private keys or network configuration are
stored in the migration helpers.

```ts
import { MigrationGate } from '@dstoken-solana/rwa-rbac';

// client, controller, payer, user, and gates are supplied by your application.
const roles = await client.userRoles.all(controller);
const gates: Record<string, MigrationGate | null> = {
  // Provide an explicit entry for every legacy role.
  // [roleAddress]: { authority: gatePda, proof: { programId, seeds } },
  // [emergencyRoleAddress]: null,
};
const plan = await client.userRoles.planMigration({
  assetAccessController: controller,
  payer,
  user,
  authorizedUserRole: masterRole,
  // gateAuthority: masterGate, // Include the incoming gate if this batch migrates the authorizing master.
  gates,
});

for (const { userRole, instruction } of plan.pending) {
  // Submit through your existing governance workflow.
  // Several instructions can share a transaction when size and compute permit.
}

const remaining = (await client.userRoles.all(controller))
  .filter(({ account }) => account.version === 1);
if (remaining.length !== 0) throw new Error('Asset migration is incomplete');
```

Use `userRoles.fetch(address)` and `userRoles.all(controller)` for compatibility
reads. Anchor's ordinary `rbacProgram.account.userRole` decoder describes V2 only.
`userRoles.migrateIxn(args)` builds a single-role instruction. `planMigration`
requires a gate configuration for every remaining legacy role before returning
instructions, and can be run again after a partially completed batch.

The controller's current admin can authorize migration. Alternatively, a member of
that controller's master role can authorize it; a migrated master must also supply
its configured gate signer. This supports controllers whose admin was voided.
A role with any gated permission must receive an authority during migration.
The incoming authority is supplied as a public-key argument with a derivation
proof; its account and signature are not required. This verifies derivation,
without demonstrating that the authority can currently sign. Ordinary role
creation and authority updates retain their separate signer-consent checks.

Migration resizes each account for its current user count. If historical removals
left spare capacity, migration shrinks it and refunds all lamports above the new
rent minimum to the specified payer. Choose the payer with this refund in mind.

Each role is converted atomically at its existing PDA. Its ID, name, permissions,
master status, and users are preserved. Legacy account padding is not interpreted
as configuration. Migration accepts only the original deployed role layout;
repeated conversion is rejected on-chain, and the planner skips V2 accounts.

Migrate all roles for a controller together. If multiple transactions are needed,
stop administrative activity for that asset operationally until all transactions
are confirmed and a final discovery returns no V1 accounts. Discovery fetches both
layouts in one RPC query; perform final verification while activity is stopped.
The program does not enforce uniform versions or track per-asset progress.
Legacy roles retain their existing permissions and may overlap migrated roles.
Legacy controller-admin authorization requires supplying a legacy role from that
controller as `authorizedUserRole`; omission never enables an admin bypass.
Newly created roles always use V2, even during a legacy asset's migration window.

V2 places the controller, ID, version, permission flags, and master status first.
The variable-size gate option, role name, and users follow. V2 uses a new
discriminator; the version byte also lets the compatibility representation preserve V1 writes without a generic account wrapper or custom IDL
builder. Existing accounts from an unreleased gating build are not treated as V1.

After all assets are migrated, verify that no program-owned accounts with the V1
role discriminator remain (including unused roles), then remove the migration
instruction, legacy codec, authorization branches, and SDK V1 decoder. Keep the V2
discriminator and wire layout unchanged. The controller layout and IMR are unchanged.

## SDK and program rollout

This RBAC release makes issuance immediate. Deploy it only alongside a token
program that enforces mint caps and the delayed over-cap path on every issuance
route; RBAC does not provide those limits.

The SDK supports both account layouts through `userRoles`, but its instruction
builders target the upgraded program. The pre-gating SDK does not support the
new instruction interface or V2 role layout.

1. Publish and stage the updated SDK in applications and indexers. Replace direct
   Anchor role reads with the compatibility helpers before migration begins.
2. Coordinate the program upgrade and activation of updated transaction builders
   during a brief write pause. Refresh pending transactions or proposals encoded
   with the old instruction interface.
3. Resume legacy operations, then migrate and verify every role for one asset at
   a time. V2 operations require the configured gate and its signing workflow.
4. Once no V1 accounts remain, remove migration and legacy support in a cleanup
   release while preserving the V2 layout and ordinary instruction interface.
