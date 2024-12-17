use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke},
};
use anchor_spl::{
    associated_token::get_associated_token_address_with_program_id,
    token_interface::{Mint, Token2022, TokenAccount},
};
use rwa_imr::{helper::get_discriminator, Investor};

use crate::{
    constants::{ASSET_CONTROLLER_ID, IDENTITY_REGISTRY_ID},
    error::ErrorCode,
    external_accounts::*,
    state::*,
};

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct CreateInvestorLocks<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    #[account(
        init,
        seeds = [
            &investor.investor_id.as_ref(),
            &investor.identity_registry.as_ref(),
            &wallet.as_ref(),
            b"InvestorLocks".as_ref(),
        ],
        bump,
        space = 8 + InvestorLocks::INIT_SPACE,
        payer = payer
    )]
    pub investor_locks: Account<'info, InvestorLocks>,
    #[account(has_one = authority)]
    pub investor: Account<'info, Investor>,
    /// CHECKED: Validated in deserialized_checked.
    #[account(address = investor.identity_account)]
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Verfied by checking seed derivation of known identity_registry.
    #[account(mut)]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        token::mint = asset_mint,
        token::authority = wallet,
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
    /// Optionally lock a specific wallet attached to an Investor, instead of the owner.
    /// CHECKED: Validated to match identity_account and wallet.
    pub wallet_identity: Option<UncheckedAccount<'info>>,
}

impl<'info> CreateInvestorLocks<'info> {
    // Verify asset_mint by checking seed derivation for known identity_registry.
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

    // Verify that wallet being locked matches value in wallet_identity if provided,
    // or owner of identity_account if not provided.
    fn validate_wallet(&self, ctx: &Context<CreateInvestorLocks>, wallet: Pubkey) -> Result<()> {
        let identity_account =
            IdentityAccount::deserialize_checked(&ctx.accounts.identity_account)?;

        if let Some(acc) = &ctx.accounts.wallet_identity {
            let wallet_identity = WalletIdentity::deserialize_checked(acc)?;
            require_keys_eq!(
                wallet_identity.identity_account,
                ctx.accounts.identity_account.key()
            );

            require_keys_eq!(wallet, wallet_identity.wallet);
        } else {
            require_keys_eq!(wallet, identity_account.owner);
        }
        Ok(())
    }

    /// Validate and execute freeze_token_account CPI to freeze locked_token_account.
    fn validate_and_freeze_token_account(
        &self,
        ctx: &Context<CreateInvestorLocks>,
        wallet: &Pubkey,
    ) -> Result<()> {
        let locked_acc = &ctx.accounts.locked_token_account;

        // Check that locked_token_account is not an associated token account (used for storing unlocked tokens).
        let token_ata = get_associated_token_address_with_program_id(
            wallet,
            &ctx.accounts.asset_mint.key(),
            &ctx.accounts.token_program.key(),
        );
        require_keys_neq!(locked_acc.key(), token_ata);

        // Expecting locked_token_account to be newly created with zero tokens, no delegate or close authority.
        require_eq!(locked_acc.amount, 0, ErrorCode::InvalidTokenAccountState);
        require!(
            locked_acc.close_authority.is_none(),
            ErrorCode::InvalidTokenAccountState
        );
        require!(
            locked_acc.delegate.is_none(),
            ErrorCode::InvalidTokenAccountState
        );

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

pub fn handler(ctx: Context<CreateInvestorLocks>, wallet: Pubkey) -> Result<()> {
    ctx.accounts.validate_asset_mint(&ctx)?;
    ctx.accounts.validate_wallet(&ctx, wallet)?;
    ctx.accounts
        .validate_and_freeze_token_account(&ctx, &wallet)?;

    let investor_locks = &mut ctx.accounts.investor_locks;
    investor_locks.investor = ctx.accounts.investor.key();
    investor_locks.wallet = wallet;
    investor_locks.locked_token_account = ctx.accounts.locked_token_account.key();

    Ok(())
}
