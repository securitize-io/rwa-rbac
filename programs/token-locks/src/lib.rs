#![allow(ambiguous_glob_reexports)]

pub mod error;
pub mod instructions;
pub mod state;

pub use instructions::*;
pub use state::*;

use anchor_lang::prelude::*;

declare_id!("HKYfwoKujgGHJdHjDAxW8pqqNLmVSe9ukbua8tnQEFPz");

#[program]
pub mod token_locks {
    use super::*;

    pub fn create_investor_locks(ctx: Context<CreateInvestorLocks>) -> Result<()> {
        instructions::create_investor_locks::handler(ctx)
    }

    pub fn close_investor_locks(ctx: Context<CloseInvestorLocks>) -> Result<()> {
        instructions::close_investor_locks::handler(ctx)
    }

    pub fn add_token_lock<'info>(
        ctx: Context<'_, '_, '_, 'info, AddTokenLock<'info>>,
        value: u64,
        release_time: i64,
        reason_code: u64,
        reason_string: String,
    ) -> Result<()> {
        instructions::add_token_lock::handler(ctx, value, release_time, reason_code, reason_string)
    }

    pub fn remove_token_lock<'info>(
        ctx: Context<'_, '_, '_, 'info, RemoveTokenLock<'info>>,
        is_user_authorized: bool,
        indices: Vec<u8>,
    ) -> Result<()> {
        instructions::remove_token_lock::handler(ctx, is_user_authorized, indices)
    }
}
