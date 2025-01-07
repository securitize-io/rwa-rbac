use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use rbac_utils::{
    constants::{IDENTITY_METADATA_REGISTRY_ID, IDENTITY_REGISTRY_ID},
    REMOVE_LEVEL_FROM_IDENTITY_ACCOUNT_IX,
};

use crate::{controller_seeds, error::ErrorCode, state::*, verify_medici_signer};

#[derive(Accounts)]
pub struct RemoveLevelFromIdentityAccount<'info> {
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
    #[account(address = IDENTITY_REGISTRY_ID)]
    pub identity_registry_program: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub identity_registry: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Verify seeds and that data is empty.
    /// Note that if identity_to_investor exists for investor, CPI to IdentityMetadataRegistry should be called.
    #[account(
        seeds = [
            &identity_account.key().as_ref(),
            b"IdentityToInvestor".as_ref(),
        ],
        bump,
        seeds::program = IDENTITY_METADATA_REGISTRY_ID,
        constraint = identity_to_investor.data_is_empty() @ ErrorCode::DataIsNotEmpty,
    )]
    pub identity_to_investor: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: checked in cpi
    pub policy_engine_program: UncheckedAccount<'info>,
    /// CHECK: checked in cpi
    #[account(mut)]
    pub policy_engine: UncheckedAccount<'info>,
    /// CHECK: checked in cpi
    pub tracker_account: UncheckedAccount<'info>,
    /// CHECK: checked in cpi
    pub asset_mint: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<RemoveLevelFromIdentityAccount>, cpi_data: Vec<u8>) -> Result<()> {
    let controller = &ctx.accounts.asset_access_controller;

    // Verify that signer is either a controller admin or has authorized user role.
    verify_medici_signer(
        ctx.accounts.user.key(),
        controller,
        ctx.accounts.authorized_user_role.clone(),
        MediciFlags::REMOVE_LEVELS,
    )?;

    // Verify instruction discriminator in cpi_data
    require!(
        cpi_data.starts_with(&REMOVE_LEVEL_FROM_IDENTITY_ACCOUNT_IX),
        ErrorCode::UnknownInstruction
    );

    // Perform CPI to IdentityRegistry Program.
    let seeds = controller_seeds!(controller);
    let signers_seeds = &[&seeds[..]];

    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.identity_registry_program.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.payer.key(), true),
                AccountMeta::new_readonly(ctx.accounts.controller_authority.key(), true),
                AccountMeta::new_readonly(ctx.accounts.identity_registry.key(), false),
                AccountMeta::new(ctx.accounts.identity_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.policy_engine_program.key(), false),
                AccountMeta::new(ctx.accounts.policy_engine.key(), false),
                AccountMeta::new_readonly(ctx.accounts.tracker_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.asset_mint.key(), false),
            ],
            data: cpi_data,
        },
        &vec![
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.controller_authority.to_account_info(),
            ctx.accounts.identity_registry.to_account_info(),
            ctx.accounts.identity_account.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.policy_engine_program.to_account_info(),
            ctx.accounts.policy_engine.to_account_info(),
            ctx.accounts.tracker_account.to_account_info(),
            ctx.accounts.asset_mint.to_account_info(),
        ],
        signers_seeds,
    )?;

    Ok(())
}
