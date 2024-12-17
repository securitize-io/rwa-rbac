use anchor_lang::prelude::*;
use rwa_imr::Investor;

use crate::state::*;

#[derive(Accounts)]
pub struct CloseInvestorLocks<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    #[account(
        mut,
        close = payer,
        has_one = investor,
    )]
    pub investor_locks: Account<'info, InvestorLocks>,
    #[account(has_one = authority)]
    pub investor: Account<'info, Investor>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CloseInvestorLocks>) -> Result<()> {
    let investor_locks = &mut ctx.accounts.investor_locks;
    investor_locks.investor = ctx.accounts.investor.key();

    // Check that there are no remaining locks in InvestorLocks.
    require_eq!(investor_locks.locks.len(), 0);

    Ok(())
}
