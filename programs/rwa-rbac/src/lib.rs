#![allow(ambiguous_glob_reexports)]

pub mod constants;
pub mod error;
pub mod helper;
pub mod instructions;
pub mod macros;
pub mod state;

pub use helper::*;
pub use instructions::*;
pub use state::*;

use anchor_lang::prelude::*;

declare_id!("9gUXb1jJ4wmwht3G6mMaHdWbo2gf7faHYyM6ryVGy4ae");

#[program]
pub mod rwa_rbac {
    use super::*;

    pub fn create_controller(
        ctx: Context<CreateAssetAccessController>,
        unique_seed: u64,
    ) -> Result<()> {
        create_controller::handler(ctx, unique_seed)
    }

    pub fn create_user_role(
        ctx: Context<CreateUserRole>,
        name: String,
        allowed_admin_ixs: u64,
        allowed_medici_ixs: u64,
    ) -> Result<()> {
        instructions::create_user_role::handler(ctx, name, allowed_admin_ixs, allowed_medici_ixs)
    }

    pub fn assign_user_role(
        ctx: Context<AssignUserRole>,
        users_to_assign: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::assign_user_role::handler(ctx, users_to_assign)
    }

    pub fn issue_tokens(ctx: Context<IssueTokens>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::issue_tokens::handler(ctx, cpi_data)
    }

    pub fn update_asset_metadata(
        ctx: Context<UpdateAssetMetadata>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::update_asset_metadata::handler(ctx, cpi_data)
    }

    pub fn thaw_token_account(ctx: Context<ThawTokenAccount>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::thaw_token_account::handler(ctx, cpi_data)
    }

    pub fn freeze_token_account(ctx: Context<FreezeTokenAccount>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::freeze_token_account::handler(ctx, cpi_data)
    }

    pub fn revoke_tokens<'info>(
        ctx: Context<'_, '_, '_, 'info, RevokeTokens<'info>>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::revoke_tokens::handler(ctx, cpi_data)
    }

    pub fn close_mint_account(ctx: Context<CloseMintAccount>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::close_mint_account::handler(ctx, cpi_data)
    }

    pub fn update_interest_bearing_mint_rate(
        ctx: Context<UpdateInterestBearingMintRate>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::update_interest_bearing_mint_rate::handler(ctx, cpi_data)
    }

    pub fn create_policy_account(
        ctx: Context<CreatePolicyAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::create_policy_account::handler(ctx, cpi_data)
    }

    pub fn attach_to_policy_account(
        ctx: Context<AttachToPolicyAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::attach_to_policy_account::handler(ctx, cpi_data)
    }

    pub fn detach_from_policy_account(
        ctx: Context<DetachFromPolicyAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::detach_from_policy_account::handler(ctx, cpi_data)
    }

    pub fn create_identity_account(
        ctx: Context<CreateIdentityAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::create_identity_account::handler(ctx, cpi_data)
    }

    pub fn add_level_to_identity_account(
        ctx: Context<AddLevelToIdentityAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::add_level_to_identity_account::handler(ctx, cpi_data)
    }

    pub fn remove_level_from_identity_account(
        ctx: Context<RemoveLevelFromIdentityAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::remove_level_from_identity_account::handler(ctx, cpi_data)
    }

    pub fn revoke_identity_account(
        ctx: Context<RevokeIdentityAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::revoke_identity_account::handler(ctx, cpi_data)
    }
}
