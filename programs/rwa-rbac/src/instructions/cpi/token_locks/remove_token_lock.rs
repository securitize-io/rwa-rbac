use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::token_2022::Token2022;
use rbac_utils::{
    constants::{ASSET_CONTROLLER_ID, TOKEN_LOCKS_ID},
    REMOVE_TOKEN_LOCK_IX,
};

use crate::{controller_seeds, state::*, verify_medici_signer};

#[derive(Accounts)]
pub struct RemoveTokenLock<'info> {
    pub user: Signer<'info>,
    /// CHECK: Verified to match field in asset_access_controller.
    #[account(mut)]
    pub controller_authority: UncheckedAccount<'info>,
    #[account(has_one = controller_authority)]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Option<Account<'info, UserRole>>,
    /// CHECK: Checked against known program address.
    #[account(address = TOKEN_LOCKS_ID)]
    pub token_locks_program: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub investor_locks: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub investor: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub wallet_identity_account: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub asset_mint: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub unlocked_token_account: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub locked_token_account: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    pub asset_controller: UncheckedAccount<'info>,
    /// CHECK: Verified in CPI.
    #[account(mut)]
    pub identity_registry: UncheckedAccount<'info>,
    /// CHECK: Checked against known program address.
    #[account(address = ASSET_CONTROLLER_ID)]
    pub asset_controller_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, RemoveTokenLock<'info>>,
    indices: Vec<u8>,
) -> Result<()> {
    let controller = &ctx.accounts.asset_access_controller;

    // Check if user is authorized as controller admin or with remove token lock user role.
    // This information is passed to TokenLocks program for futher verification.
    let is_user_authorized = verify_medici_signer(
        ctx.accounts.user.key(),
        controller,
        ctx.accounts.authorized_user_role.clone(),
        MediciFlags::REMOVE_TOKEN_LOCK,
    )
    .is_ok();

    // Build data arg for CPI manually.
    let mut cpi_data = REMOVE_TOKEN_LOCK_IX.to_vec();
    cpi_data.extend(&[u8::from(is_user_authorized)][..]);
    cpi_data.extend((indices.len() as u32).to_le_bytes());
    cpi_data.extend(indices);

    let seeds = controller_seeds!(controller);
    let signers_seeds = &[&seeds[..]];

    // Prepare account meta and info vec.
    let mut account_metas = vec![
        AccountMeta::new_readonly(ctx.accounts.user.key(), true),
        AccountMeta::new(ctx.accounts.controller_authority.key(), true),
        AccountMeta::new(ctx.accounts.investor_locks.key(), false),
        AccountMeta::new_readonly(ctx.accounts.investor.key(), false),
        AccountMeta::new_readonly(ctx.accounts.wallet_identity_account.key(), false),
        AccountMeta::new_readonly(ctx.accounts.identity_account.key(), false),
        AccountMeta::new(ctx.accounts.asset_mint.key(), false),
        AccountMeta::new(ctx.accounts.unlocked_token_account.key(), false),
        AccountMeta::new(ctx.accounts.locked_token_account.key(), false),
        AccountMeta::new_readonly(ctx.accounts.asset_controller.key(), false),
        AccountMeta::new(ctx.accounts.identity_registry.key(), false),
        AccountMeta::new_readonly(ctx.accounts.asset_controller_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
    ];
    let mut account_infos = vec![
        ctx.accounts.user.to_account_info(),
        ctx.accounts.controller_authority.to_account_info(),
        ctx.accounts.investor_locks.to_account_info(),
        ctx.accounts.investor.to_account_info(),
        ctx.accounts.wallet_identity_account.to_account_info(),
        ctx.accounts.identity_account.to_account_info(),
        ctx.accounts.asset_mint.to_account_info(),
        ctx.accounts.unlocked_token_account.to_account_info(),
        ctx.accounts.locked_token_account.to_account_info(),
        ctx.accounts.asset_controller.to_account_info(),
        ctx.accounts.identity_registry.to_account_info(),
        ctx.accounts.asset_controller_program.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
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

    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.token_locks_program.key(),
            accounts: account_metas,
            data: cpi_data,
        },
        &account_infos,
        signers_seeds,
    )?;

    Ok(())
}
