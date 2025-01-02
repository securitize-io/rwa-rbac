use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke},
};
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};

use rwa_imr::{helper::get_discriminator, Investor};

use crate::{constants::*, error::ErrorCode, external_accounts::{IdentityAccount, WalletIdentity}, state::*};

#[derive(Accounts)]
pub struct RemoveTokenLock<'info> {
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
    /// CHECK: Checked by seize SPI
    pub asset_controller: UncheckedAccount<'info>,
    /// CHECK: Checked against known identity_registry address.
    #[account(mut)]
    pub identity_registry: UncheckedAccount<'info>,
    /// CHECK: Checked against known program address.
    #[account(address = ASSET_CONTROLLER_ID)]
    pub asset_controller_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
}

impl<'info> RemoveTokenLock<'info> {
    /// Execute seize_tokens CPI with AssetController program to transfer tokens from locked
    /// to unlocked token account using permanent delegate role.
    fn transfer_tokens(
        &self,
        ctx: &Context<'_, '_, '_, 'info, RemoveTokenLock<'info>>,
        value: u64,
    ) -> Result<()> {
        // Prepare account meta and info vec.
        let mut account_metas = vec![
            AccountMeta::new(ctx.accounts.authority.key(), true),
            AccountMeta::new_readonly(ctx.accounts.asset_mint.key(), false),
            AccountMeta::new_readonly(ctx.accounts.asset_controller.key(), false),
            AccountMeta::new(ctx.accounts.unlocked_token_account.key(), false),
            AccountMeta::new(ctx.accounts.locked_token_account.key(), false),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.identity_account.key(), false),
            AccountMeta::new_readonly(ctx.accounts.wallet_identity_account.key(), false),
        ];

        let mut account_infos = vec![
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.asset_mint.to_account_info(),
            ctx.accounts.asset_controller.to_account_info(),
            ctx.accounts.unlocked_token_account.to_account_info(),
            ctx.accounts.locked_token_account.to_account_info(),
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
    fn freeze_account(&self, ctx: &Context<RemoveTokenLock>) -> Result<()> {
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
    fn thaw_account(&self, ctx: &Context<RemoveTokenLock>) -> Result<()> {
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
    
    // Verify that receiver wallet matches value in identity_account or wallet_identity
    fn validate_wallet(&self, ctx: &Context<RemoveTokenLock>) -> Result<()> {
        let identity_account =
            IdentityAccount::deserialize_checked(&ctx.accounts.identity_account)?;

        if identity_account.owner == ctx.accounts.unlocked_token_account.owner {
            return Ok(());
        }

        let wallet_identity = WalletIdentity::deserialize_checked(&ctx.accounts.wallet_identity_account)?;

        require_keys_eq!(
            wallet_identity.identity_account,
            ctx.accounts.identity_account.key()
        );

        require_keys_eq!(ctx.accounts.unlocked_token_account.owner, wallet_identity.wallet);
        Ok(())
    }
}

/// Instruction to remove a lock from InvestorLocks and release locked tokens back to unlocked account.
/// As this instruction is intended to be invoked through RBAC, the RBAC program will check (but not enforce)
/// that the user has an authorized role to perform RemoveTokenLock. If the user is not authorized, this instruction will
/// only proceed if the lock has expired.
pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, RemoveTokenLock<'info>>,
    is_user_authorized: bool,
    index: u64,
) -> Result<()> {
    let index = usize::try_from(index).unwrap();
    let lock_to_remove = ctx.accounts.investor_locks.locks.get(index).unwrap();

    // Return error if a non-authorized user (as checked by RBAC) tries to remove a lock that has yet expired.
    if !lock_to_remove.has_expired()? {
        require!(is_user_authorized, ErrorCode::UnauthorizedUser);
    }

    ctx.accounts.validate_wallet(&ctx)?;

    // Thaw locked_token_account first so it can receive tokens from the unlocked_token_account.
    ctx.accounts.thaw_account(&ctx)?;

    // Release locked tokens for lock removed back to wallet.
    ctx.accounts.transfer_tokens(&ctx, lock_to_remove.value)?;

    // Refreeze locked_token_account after transfer.
    ctx.accounts.freeze_account(&ctx)?;

    // Remove lock from locks.
    ctx.accounts.investor_locks.locks.remove(index);
    Ok(())
}
