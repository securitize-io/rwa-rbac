use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, verify_gate_authority};

#[derive(Accounts)]
pub struct UpdateControllerAdmin<'info> {
    pub admin: Signer<'info>,
    pub gate_authority: Option<Signer<'info>>,
    #[account(mut, has_one = admin)]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Account<'info, UserRole>,
}

pub fn handler(ctx: Context<UpdateControllerAdmin>, new_admin: Pubkey) -> Result<()> {
    // Admin rotation is intrinsically gated, without consuming a permission bit.
    // Both the current controller admin and its master role's authority must approve.
    let role = &ctx.accounts.authorized_user_role;
    require!(
        role.is_master_role && role.users.contains(&ctx.accounts.admin.key()),
        ErrorCode::InvalidMasterRole
    );
    verify_gate_authority(role, ctx.accounts.gate_authority.as_ref())?;
    let controller = &mut ctx.accounts.asset_access_controller;

    if !controller.has_master_role {
        require!(
            new_admin != Pubkey::default(),
            ErrorCode::CannotVoidAuthority
        );
    }

    controller.admin = new_admin;

    Ok(())
}
