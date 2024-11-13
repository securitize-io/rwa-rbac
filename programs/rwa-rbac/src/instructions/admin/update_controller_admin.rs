use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
pub struct UpdateControllerAdmin<'info> {
    pub user: Signer<'info>,
    #[account(constraint = asset_access_controller.admin == user.key())]
    pub asset_access_controller: Account<'info, AssetAccessController>,
}

pub fn handler(ctx: Context<UpdateControllerAdmin>, new_admin: Pubkey) -> Result<()> {
    let controller = &mut ctx.accounts.asset_access_controller;
    controller.admin = new_admin;

    Ok(())
}
