use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::token_2022::Token2022;

use crate::{
    constants::ASSET_CONTROLLER_ID, controller_seeds, error::ErrorCode, get_discriminator,
    state::*, verify_medici_signer,
};

#[derive(Accounts)]
pub struct CloseMintAccount<'info> {
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
    pub token_program: Program<'info, Token2022>,
}

pub fn handler(ctx: Context<CloseMintAccount>, cpi_data: Vec<u8>) -> Result<()> {
    let controller = &ctx.accounts.asset_access_controller;

    // Verify that signer is either a controller admin or has authorized user role.
    verify_medici_signer(
        ctx.accounts.user.key(),
        controller,
        ctx.accounts.authorized_user_role.clone(),
        MediciFlags::CLOSE_MINT_ACCOUNT,
    )?;

    // Verify instruction discriminator in cpi_data
    require!(
        cpi_data.starts_with(&get_discriminator("close_mint_account")),
        ErrorCode::UnknownInstruction
    );

    // Perform CPI to AssetController Program.
    let seeds = controller_seeds!(controller);
    let signers_seeds = &[&seeds[..]];

    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.asset_controller_program.key(),
            accounts: vec![
                // Mutable as authority is used as rent receiver on account closure.
                AccountMeta::new(ctx.accounts.controller_authority.key(), true),
                AccountMeta::new(ctx.accounts.asset_mint.key(), false),
                AccountMeta::new_readonly(ctx.accounts.asset_controller.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
            ],
            data: cpi_data,
        },
        &[
            ctx.accounts.controller_authority.to_account_info(),
            ctx.accounts.asset_mint.to_account_info(),
            ctx.accounts.asset_controller.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        signers_seeds,
    )?;

    Ok(())
}
