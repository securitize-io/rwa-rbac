use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke},
};
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};
use rbac_utils::{
    constants::ASSET_CONTROLLER_ID, external_accounts::WalletIdentity, FREEZE_TOKEN_ACCOUNT_IX,
    SEIZE_TOKENS_IX, THAW_TOKEN_ACCOUNT_IX,
};
use rwa_imr::Investor;

use crate::{error::ErrorCode, state::*};

#[derive(Accounts)]
pub struct RemoveTokenLock<'info> {
    pub user: Signer<'info>,
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
        has_one = identity_account,
    )]
    pub investor: Account<'info, Investor>,
    /// CHECK: Checked by validate_unlocked_token_account.
    pub wallet_identity_account: UncheckedAccount<'info>,
    /// CHECK: Address to match for known Investor.
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Checked in token transfer CPIs.
    #[account(mut)]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub unlocked_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
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
                data: [&SEIZE_TOKENS_IX, &value.to_le_bytes()[..]].concat(),
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
                data: FREEZE_TOKEN_ACCOUNT_IX.to_vec(),
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
                data: THAW_TOKEN_ACCOUNT_IX.to_vec(),
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

    /// Verify that unlocked_token_account that will receive unlocked tokens is a wallet
    /// in a matching wallet_identity.
    fn validate_unlocked_token_account(&self, ctx: &Context<RemoveTokenLock>) -> Result<()> {
        let wallet_identity =
            WalletIdentity::deserialize_checked(&ctx.accounts.wallet_identity_account)?;

        require_keys_eq!(
            wallet_identity.identity_account,
            ctx.accounts.identity_account.key()
        );
        require_keys_eq!(
            ctx.accounts.unlocked_token_account.owner,
            wallet_identity.wallet
        );
        require_keys_neq!(
            ctx.accounts.unlocked_token_account.key(),
            ctx.accounts.locked_token_account.key()
        );

        Ok(())
    }
}

/// Instruction to remove a lock from InvestorLocks and release locked tokens back to unlocked account.
/// As this instruction is intended to be invoked through RBAC, the RBAC program will check (but not enforce)
/// that the user has an authorized role to perform RemoveTokenLock. If the user is not authorized, this instruction
/// will only proceed if the lock has expired and signed user matches attached wallet.
pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, RemoveTokenLock<'info>>,
    is_user_authorized: bool,
    indices: Vec<u8>,
) -> Result<()> {
    require_gt!(indices.len(), 0);

    let mut amount_to_remove = 0_u64;

    let indices_usize: Vec<usize> = indices.iter().map(|i| usize::from(*i)).collect();

    for index in indices_usize.clone() {
        let lock_to_remove = ctx
            .accounts
            .investor_locks
            .locks
            .get(index)
            .ok_or(ErrorCode::LockNotFound)?;

        // Return error if a non-authorized user (as checked by RBAC) tries to remove a lock that has yet expired,
        // or if signed user is not the attached wallet.
        require!(
            is_user_authorized
                || (lock_to_remove.has_expired()?
                    && ctx.accounts.user.key() == ctx.accounts.unlocked_token_account.owner),
            ErrorCode::UnauthorizedUser
        );

        amount_to_remove = amount_to_remove.checked_add(lock_to_remove.value).unwrap();
    }

    ctx.accounts.validate_unlocked_token_account(&ctx)?;

    // Thaw locked_token_account first so it can receive tokens from the unlocked_token_account.
    ctx.accounts.thaw_account(&ctx)?;

    // Release locked tokens for all locks removed back to wallet.
    ctx.accounts.transfer_tokens(&ctx, amount_to_remove)?;

    // Refreeze locked_token_account after transfer.
    ctx.accounts.freeze_account(&ctx)?;

    // Remove locks in descending index order.
    ctx.accounts.investor_locks.remove_locks(indices_usize)?;

    Ok(())
}
