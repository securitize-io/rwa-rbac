use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke},
};

use crate::{constants::IDENTITY_REGISTRY_ID, helper::get_discriminator, state::*};

#[derive(Accounts)]
pub struct AddLevels<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub investor: Account<'info, Investor>,
    /// CHECK: Checked against known program address.
    #[account(address = IDENTITY_REGISTRY_ID)]
    pub identity_registry_program: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub identity_registry: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub identity_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AddLevels>,
    levels: Vec<u8>,
    expiries: Vec<i64>,
    proof_hashes: Vec<String>,
) -> Result<()> {
    require_eq!(levels.len(), expiries.len());
    require_eq!(expiries.len(), proof_hashes.len());

    let investor = &mut ctx.accounts.investor;
    investor.last_updated_by = ctx.accounts.payer.key();
    for i in 0..levels.len() {
        investor.levels.push(LevelData {
            level: levels[i],
            proof_hash: proof_hashes[i].clone(),
        });
    }

    // Check that updated investor.levels is still valid.
    investor.validate_levels()?;

    // Add each level to IdentityAccount via CPI.
    for i in 0..levels.len() {
        let cpi_data: Vec<u8> = [
            &get_discriminator("add_level_to_identity_account"),
            &[levels[i]][..],
            &expiries[i].to_le_bytes(),
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
