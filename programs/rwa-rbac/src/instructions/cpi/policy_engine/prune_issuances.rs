use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use rbac_utils::{constants::POLICY_ENGINE_ID, PRUNE_ISSUANCES_IX};

use crate::{controller_seeds, state::*, verify_medici_signer};

#[derive(Accounts)]
pub struct PruneIssuances<'info> {
    pub user: Signer<'info>,
    /// CHECK: Verified to match the controller's authority.
    pub controller_authority: UncheckedAccount<'info>,
    #[account(has_one = controller_authority, has_one = asset_mint)]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Box<Account<'info, UserRole>>,
    /// CHECK: Checked against the known Policy Engine program address.
    #[account(address = POLICY_ENGINE_ID)]
    pub policy_engine_program: UncheckedAccount<'info>,
    /// CHECK: Mint and related accounts are validated by the Policy Engine CPI.
    pub asset_mint: UncheckedAccount<'info>,
    /// CHECK: Validated by the Policy Engine CPI, including authority and mint.
    pub policy_engine: UncheckedAccount<'info>,
    /// CHECK: Validated by the Policy Engine CPI.
    pub identity_registry: UncheckedAccount<'info>,
    /// CHECK: Validated by the Policy Engine CPI.
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Validated by the Policy Engine CPI, including identity and mint.
    #[account(mut)]
    pub tracker_account: UncheckedAccount<'info>,
    /// CHECK: Validated by the Policy Engine event CPI.
    pub event_authority: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<PruneIssuances>) -> Result<()> {
    verify_medici_signer(
        &ctx.accounts.user.key(),
        &ctx.accounts.authorized_user_role,
        MediciFlags::ISSUE_TOKENS,
    )?;

    let seeds = controller_seeds!(ctx.accounts.asset_access_controller);
    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.policy_engine_program.key(),
            accounts: vec![
                AccountMeta::new_readonly(ctx.accounts.controller_authority.key(), true),
                AccountMeta::new_readonly(ctx.accounts.asset_mint.key(), false),
                AccountMeta::new_readonly(ctx.accounts.policy_engine.key(), false),
                AccountMeta::new_readonly(ctx.accounts.identity_registry.key(), false),
                AccountMeta::new_readonly(ctx.accounts.identity_account.key(), false),
                AccountMeta::new(ctx.accounts.tracker_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.event_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.policy_engine_program.key(), false),
            ],
            data: PRUNE_ISSUANCES_IX.to_vec(),
        },
        &[
            ctx.accounts.controller_authority.to_account_info(),
            ctx.accounts.asset_mint.to_account_info(),
            ctx.accounts.policy_engine.to_account_info(),
            ctx.accounts.identity_registry.to_account_info(),
            ctx.accounts.identity_account.to_account_info(),
            ctx.accounts.tracker_account.to_account_info(),
            ctx.accounts.event_authority.to_account_info(),
            ctx.accounts.policy_engine_program.to_account_info(),
        ],
        &[&seeds[..]],
    )?;

    Ok(())
}
