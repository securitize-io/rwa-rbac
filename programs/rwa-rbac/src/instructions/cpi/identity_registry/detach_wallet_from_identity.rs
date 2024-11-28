use std::str::FromStr;

use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};

use crate::{
    constants::IDENTITY_REGISTRY_ID, controller_seeds, error::ErrorCode, get_discriminator,
    state::*, verify_medici_signer,
};

#[derive(Accounts)]
pub struct DetachWalletFromIdentity<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub user: Signer<'info>,
    /// CHECK: Verified to match field in asset_access_controller.
    #[account(mut)]
    pub controller_authority: UncheckedAccount<'info>,
    #[account(has_one = controller_authority)]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Option<Account<'info, UserRole>>,
    /// CHECK: Checked against known program address.
    #[account(address = Pubkey::from_str(IDENTITY_REGISTRY_ID).unwrap())]
    pub identity_registry_program: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub wallet_identity: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub identity_registry: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<DetachWalletFromIdentity>, cpi_data: Vec<u8>) -> Result<()> {
    let controller = &ctx.accounts.asset_access_controller;

    // Verify that signer is either a controller admin or has authorized user role.
    verify_medici_signer(
        ctx.accounts.user.key(),
        controller,
        ctx.accounts.authorized_user_role.clone(),
        MediciFlags::DETACH_WALLET_FROM_IDENTITY,
    )?;

    // Verify instruction discriminator in cpi_data
    require!(
        cpi_data.starts_with(&get_discriminator("detach_wallet_from_identity")),
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
                AccountMeta::new(ctx.accounts.controller_authority.key(), true),
                AccountMeta::new(ctx.accounts.wallet_identity.key(), false),
                AccountMeta::new(ctx.accounts.identity_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.identity_registry.key(), false),
            ],
            data: cpi_data,
        },
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.controller_authority.to_account_info(),
            ctx.accounts.wallet_identity.to_account_info(),
            ctx.accounts.identity_account.to_account_info(),
            ctx.accounts.identity_registry.to_account_info(),
        ],
        signers_seeds,
    )?;

    Ok(())
}
