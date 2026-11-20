use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode, state::*, verify_admin_signer, verify_gate_authority,
    verify_new_gate_authority,
};

#[derive(Accounts)]
pub struct ModifyUserRole<'info> {
    pub user: Signer<'info>,
    pub gate_authority: Option<Signer<'info>>,
    /// The target role's existing authority must consent to its replacement or removal.
    pub current_gate_authority: Option<Signer<'info>>,
    /// Consent from the proposed authority, in addition to the existing approvals.
    pub new_gate_authority: Option<Signer<'info>>,
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(
        mut,
        has_one = asset_access_controller,
    )]
    pub user_role: Account<'info, UserRole>,
    #[account(has_one = asset_access_controller)]
    pub authorized_user_role: Option<Account<'info, UserRole>>,
}

pub fn handler(
    ctx: Context<ModifyUserRole>,
    name: String,
    allowed_admin_ixs: u64,
    allowed_medici_ixs: u64,
    gate_authority_update: GateAuthorityUpdate,
) -> Result<()> {
    // Verify role membership, permission and the authorizing role's gate.
    verify_admin_signer(
        ctx.accounts.user.key(),
        &ctx.accounts.asset_access_controller,
        ctx.accounts.authorized_user_role.clone(),
        AdminFlags::MODIFY_USER_ROLE,
        ctx.accounts.gate_authority.as_ref(),
    )?;

    require!(
        !ctx.accounts.user_role.is_legacy()
            || matches!(gate_authority_update, GateAuthorityUpdate::NoChange),
        ErrorCode::MigrationRequired
    );

    // Authorize against pre-mutation state, including when another role grants MODIFY.
    if !matches!(gate_authority_update, GateAuthorityUpdate::NoChange)
        && ctx.accounts.user_role.gate_authority.is_some()
    {
        verify_gate_authority(
            &ctx.accounts.user_role,
            ctx.accounts.current_gate_authority.as_ref(),
        )?;
    }

    // Update user role.
    let user_role = &mut ctx.accounts.user_role;
    user_role.update_fields(name, allowed_admin_ixs, allowed_medici_ixs)?;
    match gate_authority_update {
        GateAuthorityUpdate::NoChange => {}
        GateAuthorityUpdate::Set { authority, proof } => {
            verify_new_gate_authority(authority, &proof, ctx.accounts.new_gate_authority.as_ref())?;
            user_role.gate_authority = Some(authority);
        }
        GateAuthorityUpdate::Clear => user_role.gate_authority = None,
    }

    Ok(())
}
