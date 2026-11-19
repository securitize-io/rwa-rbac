use crate::{
    controller_seeds, error::ErrorCode, state::*, verify_gate_authority, verify_medici_signer,
};
use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::token_2022::Token2022;
use rbac_utils::{
    MIGRATE_ASSET_CONTROLLER_IX, SET_CAPS_CONFIG_IX, SET_THROTTLE_CONFIG_IX,
    constants::ASSET_CONTROLLER_ID,
};

#[derive(Accounts)]
pub struct ConfigureMintControls<'info> {
    pub user: Signer<'info>,
    pub gate_authority: Option<Signer<'info>>,
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
    #[account(mut)]
    pub asset_controller: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    /// CHECK: The token program validates its event authority.
    pub event_authority: UncheckedAccount<'info>,
}

fn authorize(ctx: &Context<ConfigureMintControls>) -> Result<()> {
    // New governance capabilities require V2 even while existing operations support legacy roles.
    require!(
        !ctx.accounts.authorized_user_role.is_legacy(),
        ErrorCode::MigrationRequired
    );
    verify_medici_signer(
        &ctx.accounts.user.key(),
        &ctx.accounts.authorized_user_role,
        MediciFlags::MANAGE_MINT_CONTROLS,
        ctx.accounts.gate_authority.as_ref(),
    )
}

impl ConfigureMintControls<'_> {
    fn invoke(&self, cpi_data: Vec<u8>) -> Result<()> {
        let seeds = controller_seeds!(&self.asset_access_controller);
        invoke_signed(
            &Instruction {
                program_id: self.asset_controller_program.key(),
                accounts: vec![
                    AccountMeta::new_readonly(self.controller_authority.key(), true),
                    AccountMeta::new_readonly(self.asset_mint.key(), false),
                    AccountMeta::new(self.asset_controller.key(), false),
                    AccountMeta::new_readonly(self.token_program.key(), false),
                    AccountMeta::new_readonly(self.event_authority.key(), false),
                    AccountMeta::new_readonly(self.asset_controller_program.key(), false),
                ],
                data: cpi_data,
            },
            &[
                self.controller_authority.to_account_info(),
                self.asset_mint.to_account_info(),
                self.asset_controller.to_account_info(),
                self.token_program.to_account_info(),
                self.event_authority.to_account_info(),
                self.asset_controller_program.to_account_info(),
            ],
            &[seeds],
        )?;
        Ok(())
    }
}

pub fn set_caps(ctx: Context<ConfigureMintControls>, cpi_data: Vec<u8>) -> Result<()> {
    authorize(&ctx)?;
    require!(
        cpi_data.starts_with(&SET_CAPS_CONFIG_IX),
        ErrorCode::UnknownInstruction
    );
    ctx.accounts.invoke(cpi_data)
}

pub fn set_throttle(ctx: Context<ConfigureMintControls>, cpi_data: Vec<u8>) -> Result<()> {
    authorize(&ctx)?;
    require!(
        cpi_data.starts_with(&SET_THROTTLE_CONFIG_IX),
        ErrorCode::UnknownInstruction
    );
    ctx.accounts.invoke(cpi_data)
}

#[derive(Accounts)]
pub struct MigrateTokenAssetController<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub user: Signer<'info>,
    pub gate_authority: Option<Signer<'info>>,
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
    #[account(mut)]
    pub asset_controller: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    /// CHECK: The token program validates its event authority.
    pub event_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn migrate(ctx: Context<MigrateTokenAssetController>) -> Result<()> {
    let role = &ctx.accounts.authorized_user_role;
    require!(!role.is_legacy(), ErrorCode::MigrationRequired);
    require!(
        role.is_master_role && role.users.contains(&ctx.accounts.user.key()),
        ErrorCode::InvalidMasterRole
    );
    verify_gate_authority(role, ctx.accounts.gate_authority.as_ref())?;
    let seeds = controller_seeds!(&ctx.accounts.asset_access_controller);
    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.asset_controller_program.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.payer.key(), true),
                AccountMeta::new_readonly(ctx.accounts.controller_authority.key(), true),
                AccountMeta::new_readonly(ctx.accounts.asset_mint.key(), false),
                AccountMeta::new(ctx.accounts.asset_controller.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.event_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.asset_controller_program.key(), false),
            ],
            data: MIGRATE_ASSET_CONTROLLER_IX.to_vec(),
        },
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.controller_authority.to_account_info(),
            ctx.accounts.asset_mint.to_account_info(),
            ctx.accounts.asset_controller.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.event_authority.to_account_info(),
            ctx.accounts.asset_controller_program.to_account_info(),
        ],
        &[seeds],
    )?;
    Ok(())
}
