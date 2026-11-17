use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, verify_admin_signer, verify_new_gate_authority};

#[derive(Accounts)]
pub struct CreateUserRole<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub user: Signer<'info>,
    pub gate_authority: Option<Signer<'info>>,
    /// Consent from the authority being installed (may equal gate_authority).
    pub new_gate_authority: Option<Signer<'info>>,
    #[account(
        init,
        seeds = [
            &(asset_access_controller.user_roles_count + 1).to_le_bytes(),
            asset_access_controller.key().as_ref(),
            b"UserRole".as_ref(),
        ],
        bump,
        space = UserRole::BASE_SIZE,
        payer = payer
    )]
    pub new_user_role: Account<'info, UserRole>,
    #[account(mut)]
    pub asset_access_controller: Account<'info, AssetAccessController>,
    #[account(
        has_one = asset_access_controller,
    )]
    pub authorized_user_role: Option<Account<'info, UserRole>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateUserRole>,
    name: String,
    allowed_admin_ixs: u64,
    allowed_medici_ixs: u64,
    is_master_role: bool,
    gate_authority: Option<Pubkey>,
    gate_authority_proof: Option<GateAuthorityProof>,
) -> Result<()> {
    let controller = &ctx.accounts.asset_access_controller;

    // The first role atomically establishes governance. No later instruction gets an
    // admin-only fallback, including controllers whose roles have all been deleted.
    let bootstrap = controller.user_roles_count == 0 && !controller.has_master_role;
    if bootstrap {
        require_keys_eq!(
            ctx.accounts.user.key(),
            controller.admin,
            ErrorCode::InvalidUserRole
        );
        require!(is_master_role, ErrorCode::InvalidMasterRole);
        require!(gate_authority.is_some(), ErrorCode::MissingGateAuthority);
    } else {
        verify_admin_signer(
            ctx.accounts.user.key(),
            ctx.accounts.authorized_user_role.clone(),
            AdminFlags::CREATE_OR_DELETE_USER_ROLE,
            ctx.accounts.gate_authority.as_ref(),
        )?;
    }

    match (gate_authority, gate_authority_proof.as_ref()) {
        (Some(authority), proof) => verify_new_gate_authority(
            authority,
            proof.ok_or(ErrorCode::MissingGateAuthorityProof)?,
            ctx.accounts.new_gate_authority.as_ref(),
        )?,
        (None, None) => {}
        (None, Some(_)) => return err!(ErrorCode::InvalidGateAuthorityProof),
    }

    if is_master_role {
        require!(
            allowed_admin_ixs == AdminFlags::all().bits()
                && allowed_medici_ixs == MediciFlags::all().bits(),
            ErrorCode::InvalidMasterRole
        );
        require!(!controller.has_master_role, ErrorCode::InvalidMasterRole);
    }

    // Initialize new user role.
    let new_user_role = &mut ctx.accounts.new_user_role;
    new_user_role.asset_access_controller = controller.key();
    new_user_role.id = controller.user_roles_count + 1;
    new_user_role.update_fields(name, allowed_admin_ixs, allowed_medici_ixs)?;
    new_user_role.gate_authority = gate_authority;

    if is_master_role {
        new_user_role.set_master_role();
    }
    if bootstrap {
        // Avoid an ungated follow-up assignment and establish the first usable master.
        new_user_role.users.push(ctx.accounts.user.key());
        let info = new_user_role.to_account_info();
        rbac_utils::transfer_lamports_for_realloc(
            ctx.accounts.payer.to_account_info(),
            info.clone(),
            UserRole::BASE_SIZE + 32,
        )?;
        info.resize(UserRole::BASE_SIZE + 32)?;
    }

    // Perform checked incrementation of user_roles_count.
    let controller = &mut ctx.accounts.asset_access_controller;
    controller.user_roles_count = controller.user_roles_count.checked_add(1).unwrap();
    if is_master_role {
        // Reserve the master role at creation, rather than waiting for user assignment.
        controller.has_master_role = true;
    }

    Ok(())
}
