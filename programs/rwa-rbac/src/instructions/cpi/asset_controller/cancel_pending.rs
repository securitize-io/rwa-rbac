use crate::{controller_seeds, events::TokenOperationCancelled, state::*, verify_medici_signer};
use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::token_2022::Token2022;
use rbac_utils::CANCEL_PENDING_IX;
use rbac_utils::{constants::ASSET_CONTROLLER_ID, external_accounts::PendingOperation};

#[derive(Accounts)]
pub struct CancelPendingOperation<'info> {
    pub user: Signer<'info>,
    /// CHECK: Bound to the controller; signed only with the controller's seeds.
    pub controller_authority: UncheckedAccount<'info>,
    #[account(has_one = controller_authority)]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Box<Account<'info, UserRole>>,
    /// CHECK: Fixed token program address.
    #[account(address = ASSET_CONTROLLER_ID)]
    pub asset_controller_program: UncheckedAccount<'info>,
    /// CHECK: The token program validates the mint and controller relationship.
    #[account(address = asset_access_controller.asset_mint)]
    pub asset_mint: UncheckedAccount<'info>,
    /// CHECK: Ownership, layout, PDA and authority are validated by the token program.
    pub asset_controller: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    /// CHECK: The token program validates its event authority.
    pub event_authority: UncheckedAccount<'info>,
    /// CHECK: The token program requires the original rent payer as the refund destination.
    #[account(mut)]
    pub rent_payer: UncheckedAccount<'info>,
    /// CHECK: Checked decoder validates ownership, discriminator and PDA; handler binds the mint.
    #[account(mut)]
    pub pending_operation: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<CancelPendingOperation>) -> Result<()> {
    let pending = PendingOperation::deserialize_checked(&ctx.accounts.pending_operation)?;
    require_keys_eq!(
        pending.asset_mint,
        ctx.accounts.asset_mint.key(),
        anchor_lang::error::ErrorCode::ConstraintHasOne
    );
    let permission = MediciFlags::CANCEL_PENDING_OPERATIONS;
    verify_medici_signer(
        &ctx.accounts.user.key(),
        &ctx.accounts.authorized_user_role,
        permission,
        None,
    )?;
    let seeds = controller_seeds!(&ctx.accounts.asset_access_controller);
    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.asset_controller_program.key(),
            accounts: vec![
                AccountMeta::new_readonly(ctx.accounts.controller_authority.key(), true),
                AccountMeta::new_readonly(ctx.accounts.asset_mint.key(), false),
                AccountMeta::new_readonly(ctx.accounts.asset_controller.key(), false),
                AccountMeta::new(ctx.accounts.rent_payer.key(), false),
                AccountMeta::new(ctx.accounts.pending_operation.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.event_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.asset_controller_program.key(), false),
            ],
            data: CANCEL_PENDING_IX.to_vec(),
        },
        &[
            ctx.accounts.controller_authority.to_account_info(),
            ctx.accounts.asset_mint.to_account_info(),
            ctx.accounts.asset_controller.to_account_info(),
            ctx.accounts.rent_payer.to_account_info(),
            ctx.accounts.pending_operation.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.event_authority.to_account_info(),
            ctx.accounts.asset_controller_program.to_account_info(),
        ],
        &[seeds],
    )?;
    emit!(TokenOperationCancelled {
        user: ctx.accounts.user.key(),
        role_id: ctx.accounts.authorized_user_role.id,
        asset_mint: ctx.accounts.asset_mint.key(),
        operation_id: pending.id
    });
    Ok(())
}
