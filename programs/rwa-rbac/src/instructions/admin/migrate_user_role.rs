use crate::{error::ErrorCode, state::*, verify_gate_authority, verify_gate_authority_proof};
use anchor_lang::{accounts::migration::Migration, prelude::*};

#[derive(Accounts)]
pub struct MigrateUserRole<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub user: Signer<'info>,
    pub gate_authority: Option<Signer<'info>>,
    #[account(
        seeds = [asset_access_controller.asset_mint.as_ref(), b"AssetAccessController"],
        bump,
    )]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(
        mut,
        seeds = [&user_role.id.to_le_bytes(), asset_access_controller.key().as_ref(), b"UserRole"],
        bump,
        has_one = asset_access_controller,
        constraint = user_role.id > 0 && user_role.id <= asset_access_controller.user_roles_count @ ErrorCode::InvalidUserRole,
        realloc = UserRole::BASE_SIZE + user_role.users.len() * 32,
        realloc::payer = payer,
        realloc::zero = true,
    )]
    pub user_role: Migration<'info, LegacyUserRole, UserRole>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Option<Account<'info, UserRole>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<MigrateUserRole>,
    gate_authority: Option<Pubkey>,
    gate_authority_proof: Option<GateAuthorityProof>,
) -> Result<()> {
    // Preserve existing controller governance while roles are converted off-chain.
    if ctx.accounts.user.key() != ctx.accounts.asset_access_controller.admin {
        let master = ctx
            .accounts
            .authorized_user_role
            .as_ref()
            .ok_or(ErrorCode::InvalidMasterRole)?;
        require!(
            master.is_master_role && master.users.contains(&ctx.accounts.user.key()),
            ErrorCode::InvalidMasterRole
        );
        if !master.is_legacy() {
            verify_gate_authority(master, ctx.accounts.gate_authority.as_ref())?;
        }
    }

    let mut role = UserRole::from(ctx.accounts.user_role.try_as_from()?.clone());
    // Validate the new representation without granting or removing permissions.
    role.update_fields(
        role.name.clone(),
        role.allowed_admin_ixs,
        role.allowed_medici_ixs,
    )?;
    match (gate_authority, gate_authority_proof.as_ref()) {
        (Some(authority), proof) => verify_gate_authority_proof(
            authority,
            proof.ok_or(ErrorCode::MissingGateAuthorityProof)?,
        )?,
        (None, None) => require!(
            !role.has_any_admin_flag(GATED_ADMIN_FLAGS)
                && !MediciFlags::from_bits_retain(role.allowed_medici_ixs)
                    .intersects(GATED_MEDICI_FLAGS),
            ErrorCode::MissingGateAuthority
        ),
        (None, Some(_)) => return err!(ErrorCode::InvalidGateAuthorityProof),
    }
    role.version = UserRole::VERSION;
    role.gate_authority = gate_authority;
    ctx.accounts.user_role.migrate(role)
}
