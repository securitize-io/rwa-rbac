use anchor_lang::prelude::*;
use anchor_spl::{token_2022::{close_account, CloseAccount, Token2022}, token_interface::TokenAccount};
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
        has_one = wallet
    )]
    pub investor_locks: Account<'info, InvestorLocks>,
    #[account(has_one = authority)]
    pub investor: Account<'info, Investor>,
    #[account(
        mut,
        seeds = [
            &investor.investor_id.as_ref(),
            &investor.identity_registry.as_ref(),
            b"LockedTokenAccount".as_ref(),
        ],
        bump,
    )]
    pub locked_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: checked in investor_locks has_one constraint
    pub wallet: AccountInfo<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

impl<'info> CloseInvestorLocks<'info> {
    fn close_token_account(&self) -> Result<()> {
        let accounts = CloseAccount {
            account: self.locked_token_account.to_account_info(),
            destination: self.payer.to_account_info(),
            authority: self.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            self.token_program.to_account_info(),
            accounts,
        );
        close_account(cpi_ctx)?;
        Ok(())
    }
}

pub fn handler(ctx: Context<CloseInvestorLocks>) -> Result<()> {
    let investor_locks = &mut ctx.accounts.investor_locks;
    investor_locks.investor = ctx.accounts.investor.key();

    // Check that there are no remaining locks in InvestorLocks.
    require_eq!(investor_locks.locks.len(), 0);

    // close token account
    ctx.accounts.close_token_account()?;

    Ok(())
}
