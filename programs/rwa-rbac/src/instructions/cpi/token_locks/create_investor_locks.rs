use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::token_2022::Token2022;

use crate::{
    constants::{ASSET_CONTROLLER_ID, TOKEN_LOCKS_ID},
    controller_seeds, get_discriminator,
    state::*,
    verify_medici_signer,
};

#[derive(Accounts)]
pub struct CreateInvestorLocks<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub user: Signer<'info>,
    /// CHECK: Verified to match field in asset_access_controller.
    pub controller_authority: UncheckedAccount<'info>,
    #[account(has_one = controller_authority)]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Option<Account<'info, UserRole>>,
    /// CHECK: Checked against known program address.
    #[account(address = TOKEN_LOCKS_ID)]
    pub token_locks_program: UncheckedAccount<'info>,
    /// CHECK: Validated in CPI.
    pub wallet: AccountInfo<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub investor_locks: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub investor: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub asset_mint: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub locked_token_account: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub asset_controller: UncheckedAccount<'info>,
    /// CHECK: Checked against known program address.
    #[account(address = ASSET_CONTROLLER_ID)]
    pub asset_controller_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateInvestorLocks>) -> Result<()> {
    let controller = &ctx.accounts.asset_access_controller;

    // Verify that signer is either a controller admin or has authorized user role.
    verify_medici_signer(
        ctx.accounts.user.key(),
        controller,
        ctx.accounts.authorized_user_role.clone(),
        MediciFlags::CREATE_INVESTOR_LOCKS,
    )?;

    let seeds = controller_seeds!(controller);
    let signers_seeds = &[&seeds[..]];

    let accounts = vec![
        AccountMeta::new(ctx.accounts.payer.key(), true),
        AccountMeta::new_readonly(ctx.accounts.controller_authority.key(), true),
        AccountMeta::new_readonly(ctx.accounts.wallet.key(), false),
        AccountMeta::new(ctx.accounts.investor_locks.key(), false),
        AccountMeta::new_readonly(ctx.accounts.investor.key(), false),
        AccountMeta::new_readonly(ctx.accounts.identity_account.key(), false),
        AccountMeta::new(ctx.accounts.asset_mint.key(), false),
        AccountMeta::new(ctx.accounts.locked_token_account.key(), false),
        AccountMeta::new_readonly(ctx.accounts.asset_controller.key(), false),
        AccountMeta::new_readonly(ctx.accounts.asset_controller_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
    ];
    let account_infos = vec![
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.controller_authority.to_account_info(),
        ctx.accounts.wallet.to_account_info(),
        ctx.accounts.investor_locks.to_account_info(),
        ctx.accounts.investor.to_account_info(),
        ctx.accounts.identity_account.to_account_info(),
        ctx.accounts.asset_mint.to_account_info(),
        ctx.accounts.locked_token_account.to_account_info(),
        ctx.accounts.asset_controller.to_account_info(),
        ctx.accounts.asset_controller_program.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
    ];

    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.token_locks_program.key(),
            accounts,
            data: get_discriminator("create_investor_locks"),
        },
        &account_infos,
        signers_seeds,
    )?;

    Ok(())
}
