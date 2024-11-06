#![allow(ambiguous_glob_reexports)]

pub mod error;
pub mod helper;
pub mod instructions;
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
}
