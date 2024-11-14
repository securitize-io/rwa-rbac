use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction::transfer},
};

use crate::{controller_seeds, state::*};

#[derive(Accounts)]
pub struct WithdrawExcessRent<'info> {
    /// CHECK: Account to receive excess rent.
    #[account(mut)]
    pub receiver: UncheckedAccount<'info>,
    pub admin: Signer<'info>,
    /// CHECK: Verified to match field in asset_access_controller.
    #[account(mut)]
    pub controller_authority: UncheckedAccount<'info>,
    #[account(
        has_one = controller_authority,
        has_one = admin,
    )]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WithdrawExcessRent>) -> Result<()> {
    let controller_authority = &mut ctx.accounts.controller_authority;
    let seeds = controller_seeds!(ctx.accounts.asset_access_controller);
    let signers_seeds = &[&seeds[..]];

    // Transfer all lamports from controller_authority (which is a PDA, not an account) to receiver.
    invoke_signed(
        &transfer(
          controller_authority.key,
          ctx.accounts.receiver.key,
          controller_authority.lamports(),
      ),
        &[
            controller_authority.to_account_info(),
            ctx.accounts.receiver.to_account_info(),
        ],
        signers_seeds,
    )?;
    Ok(())
}
