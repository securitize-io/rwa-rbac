use anchor_lang::prelude::*;

/// Programs permitted to derive gate authorities. Extending this list requires an upgrade.
/// This validates signing provenance, not a program's approval or timelock policy.
pub const ALLOWED_GATING_PROGRAMS: &[Pubkey] =
    &[pubkey!("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf")];
