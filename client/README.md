# RWA RBAC TypeScript SDK

`@dstoken-solana/rwa-rbac` provides clients and unsigned instruction builders for
RBAC administration and the governed asset, policy, identity, and investor programs.
Applications supply the provider, signers, and transaction submission workflow.

## Installation

```sh
yarn add @dstoken-solana/rwa-rbac
```

## Clients

Create `RwaRbacClient` with an RWA Token SDK configuration and an Anchor provider.
It exposes:

- RBAC instruction builders for controllers, roles, and user assignments.
- `assetController`, `policyEngine`, `identityRegistry`, and
  `identityMetadataRegistry` for governed operations.
- `userRoles.fetch()` and `userRoles.all()` for role account reads.

Gated operations require the role's configured authority to sign through its
external governance workflow.

## Migration guides

- [User roles: V1 to V2](docs/migrations/user-roles-v2.md): compatibility,
  authorization, migration planning, and deployment sequence.

## Development

Run from this directory:

```sh
yarn type-check
yarn build:package
```

Program integration tests run from the [repository root](../README.md) with
`anchor test -- --features localnet`.
