# Local integration-test programs

The three `.so` files are test fixtures from the sibling `rwa-token` repository
at commit `b9935ce` (caps/throttling with gradual controller migration). They are
loaded through `Anchor.toml` for the normal `anchor test` Surfpool suite. Refresh
changed binaries after building that revision with Anchor 1.1.2 and `localnet`.
IRP and PE are unchanged from the earlier `2a333a4` fixtures.
These fixtures are not production deployment artifacts.

The matching token IDL is pinned at
`client/src/types/generated/asset_controller.json`. Update its generated `.ts`
definition and the external account layouts/instruction discriminators in
`rbac-utils` when changing that interface.
