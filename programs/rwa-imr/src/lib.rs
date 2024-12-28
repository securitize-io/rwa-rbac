#![allow(ambiguous_glob_reexports)]

pub mod constants;
pub mod error;
pub mod helper;
pub mod instructions;
pub mod state;

pub use instructions::*;
pub use state::*;

use anchor_lang::prelude::*;

declare_id!("6g7C5Re5hMY7Yi4dWGCEXWvzysCEePybo7jgTNBMsuL5");

#[program]
pub mod rwa_imr {
    use super::*;

    pub fn register_investor(
        ctx: Context<RegisterInvestor>,
        investor_id: String,
        collision_hash: String,
        owner: Pubkey,
        level: u8,
        expiry: i64,
        proof_hash: String,
    ) -> Result<()> {
        instructions::register_investor::handler(
            ctx,
            investor_id,
            collision_hash,
            owner,
            level,
            expiry,
            proof_hash,
        )
    }

    pub fn remove_investor(ctx: Context<RemoveInvestor>, owner: Pubkey) -> Result<()> {
        instructions::remove_investor::handler(ctx, owner)
    }

    pub fn add_levels(
        ctx: Context<AddLevels>,
        levels: Vec<u8>,
        expiries: Vec<i64>,
        proof_hashes: Vec<String>,
        enforce_limits: bool,
    ) -> Result<()> {
        instructions::add_levels::handler(ctx, levels, expiries, proof_hashes, enforce_limits)
    }

    pub fn remove_levels(
        ctx: Context<RemoveLevels>,
        levels_to_remove: Vec<u8>,
        enforce_limits: bool,
    ) -> Result<()> {
        instructions::remove_levels::handler(ctx, levels_to_remove, enforce_limits)
    }
}
