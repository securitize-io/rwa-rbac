use anchor_lang::prelude::*;

use crate::{state::*, verify_admin_signer};

#[derive(Accounts)]
pub struct CreateUserRole<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub user: Signer<'info>,
    #[account(
        init,
        seeds = [
            &(asset_access_controller.user_roles_count + 1).to_le_bytes(),
            asset_access_controller.key().as_ref(),
            b"UserRole".as_ref(),
        ],
        bump,
        space = UserRole::BASE_SIZE,
        payer = payer
    )]
    pub new_user_role: Account<'info, UserRole>,
    #[account(mut)]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(
        has_one = asset_access_controller,
        constraint = authorized_user_role.id <= asset_access_controller.user_roles_count
    )]
    pub authorized_user_role: Option<Account<'info, UserRole>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateUserRole>,
    name: String,
    allowed_admin_ixs: u64,
    allowed_medici_ixs: u64,
) -> Result<()> {
    let controller = &ctx.accounts.asset_access_controller;

    // Verify that signer is either a controller admin or has authorized user role.
    verify_admin_signer(
        ctx.accounts.user.key(),
        controller,
        ctx.accounts.authorized_user_role.clone(),
        AdminFlags::CREATE_OR_DELETE_USER_ROLE,
    )?;

    let controller_info = &controller.to_account_info();

    // Initialize new user role.
    let new_user_role = &mut ctx.accounts.new_user_role;
    new_user_role.asset_access_controller = controller_info.key();
    new_user_role.id = controller.user_roles_count + 1;
    new_user_role.update_fields(name, allowed_admin_ixs, allowed_medici_ixs)?;

    // Perform checked incrementation of user_roles_count.
    let controller = &mut ctx.accounts.asset_access_controller;
    controller.user_roles_count = controller.user_roles_count.checked_add(1).unwrap();

    Ok(())
}
