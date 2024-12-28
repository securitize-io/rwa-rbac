use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::{associated_token::AssociatedToken, token_2022::Token2022};

use crate::{
    constants::{ASSET_CONTROLLER_ID, POLICY_ENGINE_ID},
    controller_seeds,
    error::ErrorCode,
    get_discriminator,
    state::*,
    verify_medici_signer,
};

#[derive(Accounts)]
pub struct IssueTokens<'info> {
    pub user: Signer<'info>,
    /// CHECK: Verified to match field in asset_access_controller.
    #[account(mut)]
    pub controller_authority: UncheckedAccount<'info>,
    #[account(has_one = controller_authority)]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Option<Account<'info, UserRole>>,
    /// CHECK: Checked against known program address.
    #[account(address = ASSET_CONTROLLER_ID)]
    pub asset_controller_program: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub asset_mint: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub asset_controller: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub to: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub identity_registry: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub tracker_account: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    /// CHECK: Checked against known program address.
    #[account(address = POLICY_ENGINE_ID)]
    pub policy_engine_program: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub policy_engine: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub wallet_identity_account: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<IssueTokens>, cpi_data: Vec<u8>) -> Result<()> {
    let controller = &ctx.accounts.asset_access_controller;

    // Verify that signer is either a controller admin or has authorized user role.
    verify_medici_signer(
        ctx.accounts.user.key(),
        controller,
        ctx.accounts.authorized_user_role.clone(),
        MediciFlags::ISSUE_TOKENS,
    )?;

    // Verify instruction discriminator in cpi_data
    require!(
        cpi_data.starts_with(&get_discriminator("issue_tokens")),
        ErrorCode::UnknownInstruction
    );

    // Perform CPI to AssetController Program.
    let seeds = controller_seeds!(controller);
    let signers_seeds = &[&seeds[..]];

    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.asset_controller_program.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.controller_authority.key(), true),
                AccountMeta::new(ctx.accounts.asset_mint.key(), false),
                AccountMeta::new_readonly(ctx.accounts.asset_controller.key(), false),
                AccountMeta::new_readonly(ctx.accounts.to.key(), false),
                AccountMeta::new(ctx.accounts.token_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.identity_registry.key(), false),
                AccountMeta::new_readonly(ctx.accounts.identity_account.key(), false),
                AccountMeta::new(ctx.accounts.tracker_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.associated_token_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.policy_engine_program.key(), false),
                AccountMeta::new(ctx.accounts.policy_engine.key(), false),
                AccountMeta::new_readonly(ctx.accounts.wallet_identity_account.key(), false),
            ],
            data: cpi_data,
        },
        &vec![
            ctx.accounts.controller_authority.to_account_info(),
            ctx.accounts.asset_mint.to_account_info(),
            ctx.accounts.asset_controller.to_account_info(),
            ctx.accounts.to.to_account_info(),
            ctx.accounts.token_account.to_account_info(),
            ctx.accounts.identity_registry.to_account_info(),
            ctx.accounts.identity_account.to_account_info(),
            ctx.accounts.tracker_account.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.associated_token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.policy_engine_program.to_account_info(),
            ctx.accounts.policy_engine.to_account_info(),
            ctx.accounts.wallet_identity_account.to_account_info(),
        ],
        signers_seeds,
    )?;

    Ok(())
}
