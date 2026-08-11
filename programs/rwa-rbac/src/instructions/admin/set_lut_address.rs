use anchor_lang::prelude::*;

use crate::{state::*, verify_admin_signer};

#[derive(Accounts)]
pub struct SetLookuptableAddress<'info> {
    pub user: Signer<'info>,
    pub multisig_authority: Signer<'info>,
    #[account(mut)]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(
        has_one = asset_access_controller,
    )]
    pub authorized_user_role: Account<'info, UserRole>,
    /// CHECK: LUT address, no impact on the protocol if an invalid address is provided.
    pub lut_address: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<SetLookuptableAddress>) -> Result<()> {
    let controller = &ctx.accounts.asset_access_controller;

    // SET_LUT_ADDRESS is gated and requires both the role user and multisig authority.
    verify_admin_signer(
        ctx.accounts.user.key(),
        controller,
        Some(ctx.accounts.authorized_user_role.clone()),
        AdminFlags::SET_LUT_ADDRESS,
        Some(ctx.accounts.multisig_authority.key()),
    )?;

    // Set lookup table address.
    let controller = &mut ctx.accounts.asset_access_controller;
    controller.lut_address = ctx.accounts.lut_address.key();

    Ok(())
}
