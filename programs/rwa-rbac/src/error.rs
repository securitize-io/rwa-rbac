use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unknown program instruction from CPI data")]
    UnknownInstruction,

    #[msg("Invalid name")]
    InvalidName,

    #[msg("Invalid user role")]
    InvalidUserRole,

    #[msg("Data is not empty")]
    DataIsNotEmpty,

    #[msg("Unknown account discriminator")]
    UnknownAccount,

    #[msg("Missing reason or code")]
    MissingReason,
}
