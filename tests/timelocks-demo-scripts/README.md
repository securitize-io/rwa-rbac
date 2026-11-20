# Squads timelock demo

For the external-authority model and permission-gating rules, see
[Timelock gating design decision](./TIMELOCK_GATING_DESIGN.md).

## How the gated operation works

`MODIFY_USER_ROLE` is included in the program's compile-time `GATED_ADMIN_FLAGS`.
Like the other gated admin permissions, it requires both the role user and the
role's configured external authority. The controller admin has no direct bypass.

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Operator<br/>(role user + Squads member)
    participant Squads as Squads program
    participant Vault as Squads vault PDA
    participant RBAC as RWA RBAC program
    participant Role as UserRole account

    Operator->>Squads: Create and approve vault transaction<br/>containing modify_user_role
    Squads->>Squads: Record Approved status<br/>and timelock release time

    Operator->>Squads: Execute proposal
    alt Timelock has not expired
        Squads-->>Operator: TimeLockNotReleased
        Note over RBAC,Role: RBAC is not invoked<br/>Role remains unchanged
    else Timelock has expired
        Squads->>Vault: Execute approved vault transaction
        Vault->>RBAC: Invoke modify_user_role<br/>vault PDA + operator sign
        Note over RBAC: MODIFY_USER_ROLE is compile-time gated
        RBAC->>Role: Verify operator is assigned<br/>and has MODIFY_USER_ROLE
        RBAC->>Role: Verify signing vault equals<br/>gateAuthority
        alt Any RBAC check fails
            RBAC-->>Operator: Authorization error
        else Every RBAC check passes
            RBAC->>Role: Update role name
            RBAC-->>Operator: Success
        end
    end
```

The two layers have separate responsibilities:

1. **Squads** enforces membership, approval threshold, and the timelock.
2. **RBAC** enforces role membership, `MODIFY_USER_ROLE`, and the exact configured
   vault signer.

Approval therefore does not bypass the delay, and an expired timelock does not
bypass RBAC authorization. Both layers must pass for the state change to occur.

Start Anchor's Surfpool localnet in the first terminal:

```sh
anchor localnet --ignore-keys -- --features localnet
```

Then run each command from the repository root in a second terminal:

```sh
yarn exec ts-node tests/timelocks-demo-scripts/00-initialize.ts
yarn exec ts-node tests/timelocks-demo-scripts/01-create-controller.ts
yarn exec ts-node tests/timelocks-demo-scripts/03-create-multisig.ts
yarn exec ts-node tests/timelocks-demo-scripts/02-create-role.ts
yarn exec ts-node tests/timelocks-demo-scripts/04-configure-role.ts
yarn exec ts-node tests/timelocks-demo-scripts/05-create-proposal.ts
yarn exec ts-node tests/timelocks-demo-scripts/06-execute-proposal.ts
yarn exec ts-node tests/timelocks-demo-scripts/07-advance-clock.ts
yarn exec ts-node tests/timelocks-demo-scripts/06-execute-proposal.ts
```

The first execution attempt demonstrates `TimeLockNotReleased`. Run the same execution script again after advancing the clock to execute the proposal.

Every mutation script fetches and prints the state it created or changed. You can also inspect everything that currently exists after any step; accounts that have not been created yet are skipped automatically:

```sh
yarn exec ts-node tests/timelocks-demo-scripts/show-state.ts
```

Create the Squads account before bootstrapping the master role. The role script
executes creation and operator assignment through Squads, advancing the local clock
past each initialization delay. The configuration script verifies the stored gate
authority. The proposal/execution scripts then demonstrate an unreleased timelock.

The default RPC URL is `http://127.0.0.1:8899`. Override it with `RPC_URL`. The default timelock is 60 seconds; set it while initializing with, for example, `TIMELOCK_SECONDS=20`.

`00-initialize.ts` starts a fresh demo and overwrites `.timelock-demo-state.json`. That file contains throwaway local keypairs and must never be used outside local testing.
