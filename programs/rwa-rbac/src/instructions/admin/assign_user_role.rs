use anchor_lang::prelude::*;

use crate::{state::*, transfer_lamports_for_realloc, verify_admin_signer};

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
    let user_role = &mut ctx.accounts.user_role;

    // Apply the following rules if signer is not the controller admin:
    // If authorized_user_role is same as user_role, user_role needs to contain either
    // ASSIGN_OR_REMOVE_ANY_USER_ROLE or ASSIGN_OR_REMOVE_CURRENT_ROLE.
    // If authorized_user_role is not provided or is different from user_role, user_role must contain
    // ASSIGN_OR_REMOVE_ANY_USER_ROLE.
    let mut matching_flag = AdminFlags::ASSIGN_OR_REMOVE_ANY_USER_ROLE;
    if let Some(authorized_role) = &ctx.accounts.authorized_user_role {
        if authorized_role.id == user_role.id {
            matching_flag = matching_flag.union(AdminFlags::ASSIGN_OR_REMOVE_CURRENT_USER_ROLE)
        }
    }
    verify_admin_signer(
        ctx.accounts.user.key(),
        &ctx.accounts.asset_access_controller,
        ctx.accounts.authorized_user_role.clone(),
        matching_flag,
    )?;

    // Check if there's sufficient space to add new users.
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
    user_role.assign_users(users_to_assign);

    Ok(())
}
