use anchor_lang::prelude::*;

use crate::{state::*, transfer_lamports_for_realloc, verify_signer};

#[derive(Accounts)]
pub struct AssignUserRole<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub user: Signer<'info>,
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(
        mut,
        has_one = asset_access_controller,
    )]
    pub user_role: Account<'info, UserRole>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Option<Account<'info, UserRole>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AssignUserRole>, users_to_assign: Vec<Pubkey>) -> Result<()> {
    let controller = &ctx.accounts.asset_access_controller;

    // Verify that signer is either a controller admin or has authorized user role.
    verify_signer(
        ctx.accounts.user.key(),
        controller,
        ctx.accounts.authorized_user_role.clone(),
        AdminFlags::ASSIGN_OR_REMOVE_USER_ROLE,
    )?;

    // Check if there's sufficient space to add new users.
    let user_role = &ctx.accounts.user_role;
    let user_role_info = user_role.to_account_info();
    let data_len = user_role_info.data_len();
    let to_add = users_to_assign.len();

    if !user_role.has_sufficient_users_capacity(data_len, to_add) {
        // Increase account size by asssignment length. Note that not all space assigned
        // will be fully used if there are duplicated keys in assignment list.
        let new_len = data_len + 32 * to_add;
        transfer_lamports_for_realloc(
            ctx.accounts.payer.to_account_info(),
            user_role_info.clone(),
            new_len,
        )?;
        user_role_info.realloc(new_len, false)?;
    }

    // Assign users to role.
    let user_role = &mut ctx.accounts.user_role;
    user_role.assign_user_roles(users_to_assign);

    Ok(())
}
