use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode, AdminFlags, AssetAccessController, MediciFlags, UserRole,
    GATED_ADMIN_FLAGS,
};

/// Check if user matches controller admin or has role with that matches ANY admin matching_flag.
pub fn verify_admin_signer(
    user: Pubkey,
    asset_access_controller: &AssetAccessController,
    user_role: Option<Account<UserRole>>,
    matching_flag: AdminFlags,
    multisig_authority: Option<Pubkey>,
) -> Result<()> {
    if matching_flag.intersects(GATED_ADMIN_FLAGS) {
        let user_role = user_role.ok_or(ErrorCode::InvalidUserRole)?;
        let matching_bits = user_role.allowed_admin_ixs & matching_flag.bits();

        if matching_bits == 0 || !user_role.users.contains(&user) {
            return err!(ErrorCode::InvalidUserRole);
        }

        // If an operation accepts multiple flags, an ungated matching flag is sufficient to
        // authorize it without the additional authority.
        if matching_bits & !GATED_ADMIN_FLAGS.bits() == 0 {
            let multisig_authority =
                multisig_authority.ok_or(ErrorCode::MissingMultisigAuthority)?;
            let configured_multisig_authority = user_role
                .multisig_authority
                .ok_or(ErrorCode::MissingMultisigAuthority)?;
            require_keys_eq!(
                multisig_authority,
                configured_multisig_authority,
                ErrorCode::InvalidMultisigAuthority
            );
        }

        return Ok(());
    }

    if user != asset_access_controller.admin {
        let user_role = user_role.ok_or(ErrorCode::InvalidUserRole)?;
        let is_authorized =
            user_role.has_any_admin_flag(matching_flag) && user_role.users.contains(&user);
        if !is_authorized {
            return err!(ErrorCode::InvalidUserRole);
        }
    }
    Ok(())
}

/// Check if user has role that matches ALL medici matching_flag.
pub fn verify_medici_signer(
    user: &Pubkey,
    user_role: &Account<UserRole>,
    matching_flag: MediciFlags,
) -> Result<()> {
    let is_authorized =
        user_role.has_all_medici_flag(matching_flag) && user_role.users.contains(&user);
    if !is_authorized {
        return err!(ErrorCode::InvalidUserRole);
    }
    Ok(())
}
