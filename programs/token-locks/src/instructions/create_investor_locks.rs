use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke},
};
use anchor_spl::{
    token_2022::{set_authority, spl_token_2022::instruction::AuthorityType, SetAuthority},
    token_interface::{Mint, Token2022, TokenAccount},
};
use rbac_utils::{
    constants::{ASSET_CONTROLLER_ID, IDENTITY_REGISTRY_ID},
    get_discriminator,
};
use rwa_imr::Investor;

use crate::state::*;

#[derive(Accounts)]
pub struct CreateInvestorLocks<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    /// CHECK: Matches owner field in identity_account through seed derivation.
    pub wallet: AccountInfo<'info>,
    #[account(
        init,
        seeds = [
            &investor.investor_id.as_ref(),
            &investor.identity_registry.as_ref(),
            b"InvestorLocks".as_ref(),
        ],
        bump,
        space = 8 + InvestorLocks::INIT_SPACE,
        payer = payer
    )]
    pub investor_locks: Account<'info, InvestorLocks>,
    #[account(
        has_one = authority,
        has_one = identity_account
    )]
    pub investor: Account<'info, Investor>,
    /// CHECKED: Validated in deserialized_checked.
    #[account(
        seeds = [&investor.identity_registry.as_ref(), wallet.key().as_ref()],
        bump,
        seeds::program = IDENTITY_REGISTRY_ID,
    )]
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Verified by checking seed derivation of known identity_registry.
    #[account(mut)]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init,
        payer = payer,
        seeds = [
            &investor.investor_id.as_ref(),
            &investor.identity_registry.as_ref(),
            b"LockedTokenAccount".as_ref(),
        ],
        bump,
        token::mint = asset_mint,
        token::authority = authority,
        token::token_program = token_program,
    )]
    pub locked_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: Checked by freeze CPI
    pub asset_controller: UncheckedAccount<'info>,
    /// CHECK: Checked against known program address.
    #[account(address = ASSET_CONTROLLER_ID)]
    pub asset_controller_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

impl CreateInvestorLocks<'_> {
    /// Verify asset_mint by checking seed derivation for known identity_registry.
    fn validate_asset_mint(&self, ctx: &Context<CreateInvestorLocks>) -> Result<()> {
        let derived_identity_registry = Pubkey::find_program_address(
            &[ctx.accounts.asset_mint.key().as_ref()],
            &IDENTITY_REGISTRY_ID,
        )
        .0;

        require_keys_eq!(
            ctx.accounts.investor.identity_registry,
            derived_identity_registry
        );

        Ok(())
    }

    /// Sets close authority of locked token account to Investor authority.
    fn set_close_authority(&self) -> Result<()> {
        let accounts = SetAuthority {
            account_or_mint: self.locked_token_account.to_account_info(),
            current_authority: self.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), accounts);
        set_authority(
            cpi_ctx,
            AuthorityType::CloseAccount,
            Some(self.authority.key()),
        )?;
        Ok(())
    }

    /// Sets authority of locked token account to Investor owner.
    fn set_authority(&self) -> Result<()> {
        let accounts = SetAuthority {
            account_or_mint: self.locked_token_account.to_account_info(),
            current_authority: self.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), accounts);
        set_authority(
            cpi_ctx,
            AuthorityType::AccountOwner,
            Some(self.wallet.key()),
        )?;
        Ok(())
    }

    /// Validate and execute freeze_token_account CPI to freeze locked_token_account.
    fn validate_and_freeze_token_account(&self, ctx: &Context<CreateInvestorLocks>) -> Result<()> {
        invoke(
            &Instruction {
                program_id: ctx.accounts.asset_controller_program.key(),
                accounts: vec![
                    AccountMeta::new_readonly(ctx.accounts.authority.key(), true),
                    AccountMeta::new(ctx.accounts.asset_mint.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.asset_controller.key(), false),
                    AccountMeta::new(ctx.accounts.locked_token_account.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                ],
                data: get_discriminator("freeze_token_account"),
            },
            &vec![
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.asset_mint.to_account_info(),
                ctx.accounts.asset_controller.to_account_info(),
                ctx.accounts.locked_token_account.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;
        Ok(())
    }
}

pub fn handler(ctx: Context<CreateInvestorLocks>) -> Result<()> {
    ctx.accounts.validate_asset_mint(&ctx)?;
    ctx.accounts.set_close_authority()?;
    ctx.accounts.set_authority()?;
    ctx.accounts.validate_and_freeze_token_account(&ctx)?;

    let investor_locks = &mut ctx.accounts.investor_locks;
    investor_locks.investor = ctx.accounts.investor.key();
    investor_locks.wallet = ctx.accounts.wallet.key();
    investor_locks.locked_token_account = ctx.accounts.locked_token_account.key();

    Ok(())
}
