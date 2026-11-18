use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, verify_admin_signer};

#[derive(Accounts)]
pub struct DeleteUserRole<'info> {
    /// CHECK: Account to receive rent refund.
    #[account(mut)]
    pub receiver: UncheckedAccount<'info>,
    pub user: Signer<'info>,
    pub gate_authority: Option<Signer<'info>>,
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(
        mut,
        close = receiver,
        has_one = asset_access_controller,
    )]
    pub user_role: Account<'info, UserRole>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Option<Account<'info, UserRole>>,
}

pub fn handler(ctx: Context<DeleteUserRole>) -> Result<()> {
    // Verify role membership, permission and the authorizing role's gate.
    verify_admin_signer(
        ctx.accounts.user.key(),
        &ctx.accounts.asset_access_controller,
        ctx.accounts.authorized_user_role.clone(),
        AdminFlags::CREATE_OR_DELETE_USER_ROLE,
        ctx.accounts.gate_authority.as_ref(),
    )?;

    require!(
        !ctx.accounts.user_role.is_master_role,
        ErrorCode::CannotDeleteMasterRole
    );

    Ok(())
}
