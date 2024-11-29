use std::str::FromStr;

use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke},
};

use crate::{constants::IDENTITY_REGISTRY_ID, helper::get_discriminator, state::*};

#[derive(Accounts)]
pub struct RemoveLevels<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub investor: Account<'info, Investor>,
    /// CHECK: Checked against known program address.
    #[account(address = Pubkey::from_str(IDENTITY_REGISTRY_ID).unwrap())]
    pub identity_registry_program: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub identity_registry: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub identity_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RemoveLevels>, levels_to_remove: Vec<u8>) -> Result<()> {
    let investor = &mut ctx.accounts.investor;
    investor.last_updated_by = ctx.accounts.payer.key();
    investor
        .levels
        .retain(|x| !levels_to_remove.contains(&x.level));

    // Remove each level from IdentityAccount via CPI.
    for level in levels_to_remove {
        let cpi_data: Vec<u8> = [
            &get_discriminator("remove_level_from_identity_account"),
            &[level][..],
        ]
        .concat();

        invoke(
            &Instruction {
                program_id: ctx.accounts.identity_registry_program.key(),
                accounts: vec![
                    AccountMeta::new(ctx.accounts.payer.key(), true),
                    AccountMeta::new_readonly(ctx.accounts.authority.key(), true),
                    AccountMeta::new_readonly(ctx.accounts.identity_registry.key(), false),
                    AccountMeta::new(ctx.accounts.identity_account.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                ],
                data: cpi_data,
            },
            &vec![
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.identity_registry.to_account_info(),
                ctx.accounts.identity_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    }
    Ok(())
}
