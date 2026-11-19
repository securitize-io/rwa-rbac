use crate::{
    controller_seeds, error::ErrorCode, events::TokenOperationProposed, state::*,
    verify_medici_signer,
};
use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::token_2022::Token2022;
use rbac_utils::{PROPOSE_BURN_IX, PROPOSE_MINT_IX};
use rbac_utils::{constants::ASSET_CONTROLLER_ID, external_accounts::PendingOperation};

#[derive(Accounts)]
pub struct ProposeTokenOperation<'info> {
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
    #[account(address = asset_access_controller.asset_mint)]
    pub asset_mint: UncheckedAccount<'info>,
    /// CHECK: Ownership, layout, PDA and authority are validated by the token program.
    pub asset_controller: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    /// CHECK: The token program validates its event authority.
    pub event_authority: UncheckedAccount<'info>,
    /// CHECK: Bound to the identity by the token program.
    pub wallet: UncheckedAccount<'info>,
    /// CHECK: Mint proposals bind the ATA; burn proposals require an existing typed token account.
    pub token_account: UncheckedAccount<'info>,
    /// CHECK: Validated by the token program.
    pub identity_registry: UncheckedAccount<'info>,
    /// CHECK: Validated by the token program.
    pub identity_account: UncheckedAccount<'info>,
    /// CHECK: Validated by the token program.
    pub wallet_identity_account: UncheckedAccount<'info>,
    /// CHECK: Initialized and bound to the mint and request ID by the token program.
    #[account(mut)]
    pub pending_operation: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn propose_mint(ctx: Context<ProposeTokenOperation>, cpi_data: Vec<u8>) -> Result<()> {
    propose(ctx, cpi_data, MediciFlags::ISSUE_TOKENS, &PROPOSE_MINT_IX)
}

pub fn propose_burn(ctx: Context<ProposeTokenOperation>, cpi_data: Vec<u8>) -> Result<()> {
    propose(ctx, cpi_data, MediciFlags::REVOKE_TOKENS, &PROPOSE_BURN_IX)
}

fn propose(
    ctx: Context<ProposeTokenOperation>,
    cpi_data: Vec<u8>,
    permission: MediciFlags,
    discriminator: &[u8; 8],
) -> Result<()> {
    verify_medici_signer(
        &ctx.accounts.user.key(),
        &ctx.accounts.authorized_user_role,
        permission,
        None,
    )?;
    require!(
        cpi_data.starts_with(discriminator),
        ErrorCode::UnknownInstruction
    );
    let seeds = controller_seeds!(&ctx.accounts.asset_access_controller);
    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.asset_controller_program.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.payer.key(), true),
                AccountMeta::new_readonly(ctx.accounts.controller_authority.key(), true),
                AccountMeta::new_readonly(ctx.accounts.asset_mint.key(), false),
                AccountMeta::new_readonly(ctx.accounts.asset_controller.key(), false),
                AccountMeta::new_readonly(ctx.accounts.wallet.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.identity_registry.key(), false),
                AccountMeta::new_readonly(ctx.accounts.identity_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.wallet_identity_account.key(), false),
                AccountMeta::new(ctx.accounts.pending_operation.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.event_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.asset_controller_program.key(), false),
            ],
            data: cpi_data,
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
            ctx.accounts.wallet_identity_account.to_account_info(),
            ctx.accounts.pending_operation.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.event_authority.to_account_info(),
            ctx.accounts.asset_controller_program.to_account_info(),
        ],
        &[seeds],
    )?;
    let pending = PendingOperation::deserialize_checked(&ctx.accounts.pending_operation)?;
    emit!(TokenOperationProposed {
        user: ctx.accounts.user.key(),
        role_id: ctx.accounts.authorized_user_role.id,
        asset_mint: ctx.accounts.asset_mint.key(),
        operation_id: pending.id
    });
    Ok(())
}
