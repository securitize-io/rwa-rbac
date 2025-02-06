use anchor_lang::prelude::*;

#[account]
pub struct AssetAccessController {
    /// PDA generated from [asset_access_controller] as seed to be used as signer authority.
    pub controller_authority: Pubkey,

    /// Bump seed for controller_authority.
    pub controller_authority_bump: u8,

    /// Admin keypair that's allowed to manage this controller.
    pub admin: Pubkey,

    /// Unique seed used for creating this account.
    pub unique_seed: Pubkey,

    /// Number of UserRoles created since initialization. Used for deriving all created UserRole PDAs.
    pub user_roles_count: u64,

    /// Address of the lookup table.
    pub lut_address: Pubkey,
}
