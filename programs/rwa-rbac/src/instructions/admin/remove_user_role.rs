use anchor_lang::prelude::*;

use crate::{state::*, verify_admin_signer};

#[derive(Accounts)]
pub struct RemoveUserRole<'info> {
    pub user: Signer<'info>,
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(
        mut,
        has_one = asset_access_controller,
    )]
    pub user_role: Account<'info, UserRole>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Option<Account<'info, UserRole>>,
}

pub fn handler(ctx: Context<RemoveUserRole>, users_to_remove: Vec<Pubkey>) -> Result<()> {
    let controller = &ctx.accounts.asset_access_controller;

    // Verify that signer is either a controller admin or has authorized user role.
    verify_admin_signer(
        ctx.accounts.user.key(),
        controller,
        ctx.accounts.authorized_user_role.clone(),
        AdminFlags::ASSIGN_OR_REMOVE_USER_ROLE,
    )?;

    // Remove users from role.
    let user_role = &mut ctx.accounts.user_role;
    user_role.remove_users(users_to_remove);

    Ok(())
}
