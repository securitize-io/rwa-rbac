use anchor_lang::prelude::*;

#[account]
pub struct AssetAccessController {
    /// PDA generated from [unique_seed] as seed. Also matches pubkey of this account.
    pub controller_pda: Pubkey,

    /// Admin keypair that's allowed to manage this controller.
    pub admin: Pubkey,

    /// Unique seed used for creating this account.
    pub unique_seed: u64,

    /// Number of UserRoles created. Used for deriving all created UserRole PDAs.
    pub user_roles_count: u64,
}
