*Squads Timelock Demo*

*Scope*
We will demonstrate how Squads protects the compile-time gated `SET_LUT_ADDRESS` operation. The operation requires an authorized RBAC user and the configured Squads vault. Even after the proposal is approved, Squads prevents the vault transaction from executing until the timelock expires.

*Demo flow*
1. Initialize the demo accounts and addresses.
2. Create an asset access controller and display its state.
3. Create a role with `SET_LUT_ADDRESS`, assign the demo operator, and display the role.
4. Create a Squads multisig with a 60-second timelock and display its vault and configuration.
5. Configure the Squads vault as the role's multisig authority.
6. Create and approve a proposal to change the controller's LUT address.
7. Execute immediately and observe `TimeLockNotReleased`; the proposal remains approved and the controller is unchanged.
8. Advance the Surfpool clock beyond the timelock.
9. Execute the same proposal again; it succeeds, the proposal becomes executed, and the controller contains the new LUT address.

At any point, the state viewer can show all demo accounts created so far and ignore those that do not exist yet.

*Key takeaway*
Proposal approval alone is not enough. The RBAC permission, role membership, Squads vault authority, and expired timelock must all be satisfied before the gated operation can execute.
