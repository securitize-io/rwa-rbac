use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unknown program instruction from CPI data")]
    UnknownInstruction,

    #[msg("Invalid hash")]
    InvalidHash,

    #[msg("Invalid levels")]
    InvalidLevels,
}
