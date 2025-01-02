use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke},
};
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};

use rwa_imr::{helper::get_discriminator, Investor};

use crate::{constants::*, external_accounts::{IdentityAccount, WalletIdentity}, helper::transfer_lamports_for_realloc, state::*};

#[derive(Accounts)]
pub struct AddTokenLock<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// Authority of AssetController (required to execute seize CPI).
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = investor,
        has_one = locked_token_account
    )]
    pub investor_locks: Account<'info, InvestorLocks>,
    #[account(
        has_one = authority,
        has_one = identity_registry,
    )]
    pub investor: Account<'info, Investor>,
    /// CHECK: Checked by validate_wallet if needed.
    pub wallet_identity_account: UncheckedAccount<'info>,
    /// CHECKED: Validated in deserialized_checked.
    #[account(address = investor.identity_account)]
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Verified by checking against known locked_token_account.
    #[account(mut)]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub unlocked_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [
            &investor.investor_id.as_ref(),
            &investor.identity_registry.as_ref(),
            b"LockedTokenAccount".as_ref(),
        ],
        bump
    )]
    pub locked_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: Checked by seize CPI
    pub asset_controller: UncheckedAccount<'info>,
    /// CHECK: Checked against known identity_registry address.
    #[account(mut)]
    pub identity_registry: UncheckedAccount<'info>,
    /// CHECK: Checked against known program address.
    #[account(address = ASSET_CONTROLLER_ID)]
    pub asset_controller_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

impl<'info> AddTokenLock<'info> {
    /// Increase space allocation for investor locks to fit a new Lock, if needed.
    fn resize_investor_locks_if_needed(
        &self,
        ctx: &Context<AddTokenLock>,
        reason_string_len: usize,
    ) -> Result<()> {
        let investor_locks = &ctx.accounts.investor_locks;

        // Calculates amount of spare capacity available for new lock to be stored.
        let investor_locks_info = investor_locks.to_account_info();
        let data_len = investor_locks_info.data_len();
        let space_used = investor_locks.space_used();
        let spare_capacity = data_len - space_used;
        let new_lock_space = Lock::INIT_SPACE + reason_string_len;

        if spare_capacity < new_lock_space {
            let new_len = space_used + new_lock_space;
            transfer_lamports_for_realloc(
                ctx.accounts.payer.to_account_info(),
                investor_locks_info.clone(),
                new_len,
            )?;
            investor_locks_info.realloc(new_len, false)?;
        }

        Ok(())
    }

    /// Execute seize_tokens CPI with AssetController program to transfer tokens from unlocked
    /// to locked token account.
    fn transfer_tokens(
        &self,
        ctx: &Context<'_, '_, '_, 'info, AddTokenLock<'info>>,
        value: u64,
    ) -> Result<()> {
        // Prepare account meta and info vec.
        let mut account_metas = vec![
            AccountMeta::new(ctx.accounts.authority.key(), true),
            AccountMeta::new_readonly(ctx.accounts.asset_mint.key(), false),
            AccountMeta::new_readonly(ctx.accounts.asset_controller.key(), false),
            AccountMeta::new(ctx.accounts.locked_token_account.key(), false),
            AccountMeta::new(ctx.accounts.unlocked_token_account.key(), false),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.identity_account.key(), false),
            AccountMeta::new_readonly(ctx.accounts.wallet_identity_account.key(), false),
        ];

        let mut account_infos = vec![
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.asset_mint.to_account_info(),
            ctx.accounts.asset_controller.to_account_info(),
            ctx.accounts.locked_token_account.to_account_info(),
            ctx.accounts.unlocked_token_account.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.identity_account.to_account_info(),
            ctx.accounts.wallet_identity_account.to_account_info(),
        ];

        // Add remaining accounts to vecs.
        for x in ctx.remaining_accounts {
            let meta = match x.is_writable {
                true => AccountMeta::new(x.key(), x.is_signer),
                false => AccountMeta::new_readonly(x.key(), x.is_signer),
            };
            account_metas.push(meta);
            account_infos.push(x.clone());
        }

        invoke(
            &Instruction {
                program_id: ctx.accounts.asset_controller_program.key(),
                accounts: account_metas,
                data: [&get_discriminator("seize_tokens"), &value.to_le_bytes()[..]].concat(),
            },
            &account_infos,
        )?;

        Ok(())
    }

    /// Execute freeze_token_account CPI to freeze locked_token_account.
    fn freeze_account(&self, ctx: &Context<AddTokenLock>) -> Result<()> {
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

    /// Execute thaw_token_account CPI to thaw locked_token_account.
    fn thaw_account(&self, ctx: &Context<AddTokenLock>) -> Result<()> {
        invoke(
            &Instruction {
                program_id: ctx.accounts.asset_controller_program.key(),
                accounts: vec![
                    AccountMeta::new_readonly(ctx.accounts.authority.key(), true),
                    AccountMeta::new(ctx.accounts.asset_mint.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.asset_controller.key(), false),
                    AccountMeta::new(ctx.accounts.identity_registry.key(), false),
                    AccountMeta::new(ctx.accounts.locked_token_account.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                ],
                data: get_discriminator("thaw_token_account"),
            },
            &vec![
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.asset_mint.to_account_info(),
                ctx.accounts.asset_controller.to_account_info(),
                ctx.accounts.identity_registry.to_account_info(),
                ctx.accounts.locked_token_account.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;
        Ok(())
    }
    
    // Verify that wallet being locked matches value in wallet_identity if provided,
    // or owner of identity_account if not provided.
    fn validate_wallet(&self, ctx: &Context<AddTokenLock>, wallet: Pubkey) -> Result<()> {
        let identity_account =
            IdentityAccount::deserialize_checked(&ctx.accounts.identity_account)?;

        if identity_account.owner == wallet {
            return Ok(());
        }

        let wallet_identity = WalletIdentity::deserialize_checked(&ctx.accounts.wallet_identity_account)?;

        require_keys_eq!(
            wallet_identity.identity_account,
            ctx.accounts.identity_account.key()
        );

        require_keys_eq!(wallet, wallet_identity.wallet);
        Ok(())
    }
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, AddTokenLock<'info>>,
    value: u64,
    release_time: i64,
    reason_code: u64,
    reason_string: String,
) -> Result<()> {
    ctx.accounts.validate_wallet(&ctx, ctx.accounts.unlocked_token_account.owner)?;
    ctx.accounts
        .resize_investor_locks_if_needed(&ctx, reason_string.len())?;

    // Append new lock and validate that the data is allowed. There is no max length enforced for reason_string,
    // it will be capped by the max serialized transaction buffer size of 1232 bytes.
    let lock = Lock {
        value,
        release_time,
        reason_code,
        reason_string,
    };
    lock.validate()?;

    let investor_locks = &mut ctx.accounts.investor_locks;
    investor_locks.locks.push(lock);

    // Thaw locked_token_account first so it can receive tokens from the unlocked_token_account.
    ctx.accounts.thaw_account(&ctx)?;

    // Transfer unlocked tokens to locked_token_account.
    ctx.accounts.transfer_tokens(&ctx, value)?;

    // Refreeze locked_token_account after transfer.
    ctx.accounts.freeze_account(&ctx)?;
    Ok(())
}
