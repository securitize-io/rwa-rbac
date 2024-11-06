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

    pub fn create_policy_account(
        ctx: Context<CreatePolicyAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::create_policy_account::handler(ctx, cpi_data)
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
}
