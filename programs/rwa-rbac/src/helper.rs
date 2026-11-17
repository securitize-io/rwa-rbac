use anchor_lang::prelude::*;

use crate::{
    AdminFlags, GATED_ADMIN_FLAGS, GATED_MEDICI_FLAGS, GateAuthorityProof, MediciFlags, UserRole,
    constants::ALLOWED_GATING_PROGRAMS, error::ErrorCode,
};

/// Prove derivation under an allowed program without interpreting that program's state.
pub fn verify_gate_authority_proof(authority: Pubkey, proof: &GateAuthorityProof) -> Result<()> {
    require!(
        ALLOWED_GATING_PROGRAMS.contains(&proof.program_id),
        ErrorCode::InvalidGatingProgram
    );
    // Bound the seed shape explicitly and return an RBAC error for malformed inputs.
    require!(
        proof.seeds.len() <= 16 && proof.seeds.iter().all(|seed| seed.len() <= 32),
        ErrorCode::InvalidGateAuthorityProof
    );
    let seeds: Vec<&[u8]> = proof.seeds.iter().map(Vec::as_slice).collect();
    let derived = Pubkey::create_program_address(&seeds, &proof.program_id)
        .map_err(|_| error!(ErrorCode::InvalidGateAuthorityProof))?;
    require_keys_eq!(derived, authority, ErrorCode::InvalidGateAuthorityProof);
    Ok(())
}

/// New authorities must both prove their provenance and consent with signer privilege.
pub fn verify_new_gate_authority(
    authority: Pubkey,
    proof: &GateAuthorityProof,
    signer: Option<&Signer<'_>>,
) -> Result<()> {
    verify_gate_authority_proof(authority, proof)?;
    let signer = signer.ok_or(ErrorCode::MissingGateAuthority)?;
    require_keys_eq!(signer.key(), authority, ErrorCode::InvalidGateAuthority);
    Ok(())
}

/// Verify the configured external authority's actual signer privilege and key.
pub fn verify_gate_authority(role: &UserRole, authority: Option<&Signer<'_>>) -> Result<()> {
    let configured = role.gate_authority.ok_or(ErrorCode::MissingGateAuthority)?;
    let signer = authority.ok_or(ErrorCode::MissingGateAuthority)?;
    require_keys_eq!(signer.key(), configured, ErrorCode::InvalidGateAuthority);
    Ok(())
}

/// Every admin permission requires role membership; selected permissions also require a gate.
/// Callers constrain the role's controller with has_one before invoking this helper.
pub fn verify_admin_signer(
    user: Pubkey,
    user_role: Option<Account<UserRole>>,
    matching_flag: AdminFlags,
    gate_authority: Option<&Signer<'_>>,
) -> Result<()> {
    let gated = matching_flag.intersects(GATED_ADMIN_FLAGS);
    let role = user_role.ok_or(ErrorCode::InvalidUserRole)?;
    require!(
        role.has_any_admin_flag(matching_flag) && role.users.contains(&user),
        ErrorCode::InvalidUserRole
    );
    if gated {
        verify_gate_authority(&role, gate_authority)?;
    }
    Ok(())
}

/// Check membership and all requested Medici permissions before checking the gate.
pub fn verify_medici_signer(
    user: &Pubkey,
    user_role: &Account<UserRole>,
    matching_flag: MediciFlags,
    gate_authority: Option<&Signer<'_>>,
) -> Result<()> {
    let gated = matching_flag.intersects(GATED_MEDICI_FLAGS);
    require!(
        user_role.has_all_medici_flag(matching_flag) && user_role.users.contains(user),
        ErrorCode::InvalidUserRole
    );
    if gated {
        verify_gate_authority(user_role, gate_authority)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn authority_proof_accepts_opaque_seeds_without_a_squads_layout() {
        let program_id = ALLOWED_GATING_PROGRAMS[0];
        let seed = b"opaque-authority-seed";
        let (authority, bump) = Pubkey::find_program_address(&[seed], &program_id);
        let proof = GateAuthorityProof {
            program_id,
            seeds: vec![seed.to_vec(), vec![bump]],
        };
        assert!(verify_gate_authority_proof(authority, &proof).is_ok());
        assert!(verify_gate_authority_proof(Pubkey::new_unique(), &proof).is_err());
    }
}
