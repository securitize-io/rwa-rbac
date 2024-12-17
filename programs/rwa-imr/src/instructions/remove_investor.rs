use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke},
};

use crate::{constants::IDENTITY_REGISTRY_ID, helper::get_discriminator, state::*};

#[derive(Accounts)]
pub struct RemoveInvestor<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    #[account(
        mut,
        close = payer,
        has_one = authority,
    )]
    pub investor: Account<'info, Investor>,
    #[account(
        mut,
        close = payer,
        has_one = investor,
    )]
    pub identity_to_investor: Account<'info, IdentityToInvestor>,
    /// CHECK: Checked against known program address.
    #[account(address = IDENTITY_REGISTRY_ID)]
    pub identity_registry_program: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub identity_registry: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub identity_account: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<RemoveInvestor>, owner: Pubkey) -> Result<()> {
    let cpi_data = [
        &get_discriminator("revoke_identity_account"),
        owner.as_ref(),
    ]
    .concat();

    // Perform CPI to IdentityRegistry Program.
    invoke(
        &Instruction {
            program_id: ctx.accounts.identity_registry_program.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.payer.key(), true),
                AccountMeta::new_readonly(ctx.accounts.authority.key(), true),
                AccountMeta::new_readonly(ctx.accounts.identity_registry.key(), false),
                AccountMeta::new(ctx.accounts.identity_account.key(), false),
            ],
            data: cpi_data,
        },
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.identity_registry.to_account_info(),
            ctx.accounts.identity_account.to_account_info(),
        ],
    )?;
    Ok(())
}
