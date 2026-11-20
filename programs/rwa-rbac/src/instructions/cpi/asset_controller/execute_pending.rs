use crate::{controller_seeds, events::TokenOperationExecuted, state::*, verify_medici_signer};
use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::token_2022::Token2022;
use rbac_utils::EXECUTE_PENDING_IX;
use rbac_utils::external_accounts::OperationData;
use rbac_utils::{constants::ASSET_CONTROLLER_ID, external_accounts::PendingOperation};

#[derive(Accounts)]
pub struct ExecutePendingOperation<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub user: Signer<'info>,
    /// CHECK: Bound to the controller; signed only with the controller's seeds.
    pub controller_authority: UncheckedAccount<'info>,
    #[account(has_one = controller_authority)]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Box<Account<'info, UserRole>>,
    /// CHECK: Fixed token program address.
    #[account(address = ASSET_CONTROLLER_ID)]
    pub asset_controller_program: UncheckedAccount<'info>,
    /// CHECK: The token program validates the mint and controller relationship.
    #[account(mut, address = asset_access_controller.asset_mint)]
    pub asset_mint: UncheckedAccount<'info>,
    /// CHECK: Ownership, layout, PDA and authority are validated by the token program.
    #[account(mut)]
    pub asset_controller: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    /// CHECK: The token program validates its event authority.
    pub event_authority: UncheckedAccount<'info>,
    /// CHECK: Bound to the stored operation and validated by the token program.
    pub wallet: UncheckedAccount<'info>,
    /// CHECK: Bound to the stored operation and validated by the token program.
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,
    /// CHECK: Bound to the stored operation and validated by the token program.
    pub identity_registry: UncheckedAccount<'info>,
    /// CHECK: Bound to the stored operation and validated by the token program.
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Bound to the stored operation and validated by the token program.
    #[account(mut)]
    pub tracker_account: UncheckedAccount<'info>,
    /// CHECK: Bound to the stored operation and validated by the token program.
    #[account(mut)]
    pub policy_engine: UncheckedAccount<'info>,
    /// CHECK: Bound to the stored operation and validated by the token program.
    pub wallet_identity_account: UncheckedAccount<'info>,
    /// CHECK: Bound to the stored operation and validated by the token program.
    #[account(mut)]
    pub rent_payer: UncheckedAccount<'info>,
    /// CHECK: Fixed policy-engine address is validated by the token program.
    pub policy_engine_program: UncheckedAccount<'info>,
    /// CHECK: Checked decoder validates ownership, discriminator and PDA; handler binds the mint.
    #[account(mut)]
    pub pending_operation: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecutePendingOperation>) -> Result<()> {
    let pending = PendingOperation::deserialize_checked(&ctx.accounts.pending_operation)?;
    require_keys_eq!(
        pending.asset_mint,
        ctx.accounts.asset_mint.key(),
        anchor_lang::error::ErrorCode::ConstraintHasOne
    );
    // Only the validated stored payload determines the required permission.
    let permission = match &pending.data {
        OperationData::Mint { .. } => MediciFlags::ISSUE_TOKENS,
        OperationData::Burn { .. } => MediciFlags::REVOKE_TOKENS,
    };
    verify_medici_signer(
        &ctx.accounts.user.key(),
        &ctx.accounts.authorized_user_role,
        permission,
        None,
    )?;
    let seeds = controller_seeds!(&ctx.accounts.asset_access_controller);
    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.asset_controller_program.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.payer.key(), true),
                AccountMeta::new_readonly(ctx.accounts.controller_authority.key(), true),
                AccountMeta::new(ctx.accounts.asset_mint.key(), false),
                AccountMeta::new(ctx.accounts.asset_controller.key(), false),
                AccountMeta::new_readonly(ctx.accounts.wallet.key(), false),
                AccountMeta::new(ctx.accounts.token_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.identity_registry.key(), false),
                AccountMeta::new_readonly(ctx.accounts.identity_account.key(), false),
                AccountMeta::new(ctx.accounts.tracker_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.policy_engine_program.key(), false),
                AccountMeta::new(ctx.accounts.policy_engine.key(), false),
                AccountMeta::new_readonly(ctx.accounts.wallet_identity_account.key(), false),
                AccountMeta::new(ctx.accounts.rent_payer.key(), false),
                AccountMeta::new(ctx.accounts.pending_operation.key(), false),
                AccountMeta::new_readonly(ctx.accounts.event_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.asset_controller_program.key(), false),
            ],
            data: EXECUTE_PENDING_IX.to_vec(),
        },
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.controller_authority.to_account_info(),
            ctx.accounts.asset_mint.to_account_info(),
            ctx.accounts.asset_controller.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.token_account.to_account_info(),
            ctx.accounts.identity_registry.to_account_info(),
            ctx.accounts.identity_account.to_account_info(),
            ctx.accounts.tracker_account.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.policy_engine_program.to_account_info(),
            ctx.accounts.policy_engine.to_account_info(),
            ctx.accounts.wallet_identity_account.to_account_info(),
            ctx.accounts.rent_payer.to_account_info(),
            ctx.accounts.pending_operation.to_account_info(),
            ctx.accounts.event_authority.to_account_info(),
            ctx.accounts.asset_controller_program.to_account_info(),
        ],
        &[seeds],
    )?;
    emit!(TokenOperationExecuted {
        user: ctx.accounts.user.key(),
        role_id: ctx.accounts.authorized_user_role.id,
        asset_mint: ctx.accounts.asset_mint.key(),
        operation_id: pending.id
    });
    Ok(())
}
