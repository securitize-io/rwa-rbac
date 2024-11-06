use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
#[instruction(unique_seed: u64)]
pub struct CreateAssetAccessController<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub admin: Signer<'info>,
    #[account(
        init,
        seeds = [
            &unique_seed.to_le_bytes(),
            b"AssetAccessController".as_ref(),
        ],
        bump,
        space = 8 + std::mem::size_of::<AssetAccessController>(),
        payer = payer
    )]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateAssetAccessController>, unique_seed: u64) -> Result<()> {
    let controller_pda = ctx.accounts.asset_access_controller.key();
    let controller = &mut ctx.accounts.asset_access_controller;
    controller.controller_pda = controller_pda;
    controller.admin = ctx.accounts.admin.key();
    controller.bump = ctx.bumps.asset_access_controller;
    controller.unique_seed = unique_seed;
    controller.user_roles_count = 0;

    Ok(())
}
