use anchor_lang::prelude::*;

use crate::{state::*, verify_admin_signer};

#[derive(Accounts)]
pub struct SetLookuptableAddress<'info> {
    pub user: Signer<'info>,
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
    // LUT updates require role membership and permission, without a gate signature.
    verify_admin_signer(
        ctx.accounts.user.key(),
        Some(ctx.accounts.authorized_user_role.clone()),
        AdminFlags::SET_LUT_ADDRESS,
        None,
    )?;

    // Set lookup table address.
    let controller = &mut ctx.accounts.asset_access_controller;
    controller.lut_address = ctx.accounts.lut_address.key();

    Ok(())
}
