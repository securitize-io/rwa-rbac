*Squads Timelock Demo*

*Scope*
We will demonstrate how Squads protects the compile-time gated `MODIFY_USER_ROLE` operation. The operation requires an authorized RBAC user and the configured Squads vault. Even after the proposal is approved, Squads prevents the vault transaction from executing until the timelock expires.

*Demo flow*
1. Initialize the demo accounts and addresses.
2. Create an asset access controller and display its state.
3. Create a Squads account with a 60-second timelock and display its vault and configuration.
4. Bootstrap the master role and assign the operator through Squads, advancing the initialization delays.
5. Verify that the role stores the Squads vault as its gate authority.
6. Create and approve a proposal to change the role's name.
7. Execute immediately and observe `TimeLockNotReleased`; the proposal remains approved and the role is unchanged.
8. Advance the Surfpool clock beyond the timelock.
9. Execute the same proposal again; it succeeds, the proposal becomes executed, and the role contains the new name.

At any point, the state viewer can show all demo accounts created so far and ignore those that do not exist yet.

*Key takeaway*
Proposal approval alone is not enough. The RBAC permission, role membership, Squads vault authority, and expired timelock must all be satisfied before the gated operation can execute.
