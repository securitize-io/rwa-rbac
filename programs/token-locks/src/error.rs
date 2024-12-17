use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unknown program instruction from CPI data")]
    UnknownInstruction,

    #[msg("Unknown account discriminator")]
    UnknownAccount,

    #[msg("Invalid account on deserialization")]
    FailedDeserialization,

    #[msg("Invalid release time")]
    InvalidReleaseTime,

    #[msg("Invalid reason string")]
    InvalidReasonString,

    #[msg("Invalid lock value")]
    InvalidLockValue,

    #[msg("User initiating instruction is not authorized by RBAC")]
    UnauthorizedUser,

    #[msg("Invalid token account state")]
    InvalidTokenAccountState,
}
