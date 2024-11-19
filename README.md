# Medici Role-Based Access Control (RBAC) Program

## Background

Medici is composed of 4 different programs: Asset Controller, Policy Engine, Identity Registry and Data Registry. Typically, an organization may create one or more assets representing a RWA they are intending to tokenize. An asset is created by invoking the CreateAssetController instruction which sets up a new token mint, AssetControllerAccount, PolicyEngine, IdentityRegistry and DataRegistry. These accounts and token mint will have an authority, a keypair held by the organization that can authorize instructions to mutate the state of these accounts. A secondary delegate signer can be assigned, with access to a smaller scope of instructions.

## Program Design

In Medici RBAC, we introduce `AssetAccessController` as the main data structure. The `AssetAccessController` has an `admin` authority and a `controller_authority` , a [program derived address](https://solana.com/docs/core/pda) that serves as the signer authority for all accounts governed by the `AssetAccessController`. This address is intentionally set to be different from the public key of `AssetAccessController`, as `rwa-token` program has instructions that require mutability access to the signer authority.

An organization using the RBAC will first create a `AssetAccessController` , generating a `controller_authority` address. The organization will then invoke `CreateAssetController` using `controller_authority` as the authority. All accounts created as part of that instruction will also share `controller_authority` as the authority, including the Policy Engine, Identity Registry and Token Mint.

The organization admin can then:

1. create one or more `UserRole` for the various groups of stakeholders that require access to manage the asset,
2. configure instructions that a `UserRole` is given access for and
3. assign or remove wallets from a `UserRole`.

Users can then invoke instructions through the RBAC program to perform the same tasks on Medici, such as adding or modifying a policy or freezing a token account, if they are in a UserRole with authorization to call the associated instruction.

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

## Testing

Integration tests in [rwa-rbac/tests](https://github.com/exo-tech-xyz/rwa-rbac/tree/main/tests) can be invoked with `anchor test` command.

## TypeScript Client

The TypeScript [Client](https://github.com/exo-tech-xyz/rwa-rbac/tree/main/client) can be installed with `yarn install @exo-tech-xyz/rwa-rbac` command. Refer to [integration tests](https://github.com/exo-tech-xyz/rwa-rbac/blob/main/tests/cpiTests.ts) for examples on how to initialize an `RwaRbacClient` and generate instructions for the program. `RwaRbacClient` is intentionally designed to share the same interface as [`RwaClient`](https://github.com/bridgesplit/rwa-token/blob/main/clients/rwa-token-sdk/src/classes/Client.ts) whenever feasible.
