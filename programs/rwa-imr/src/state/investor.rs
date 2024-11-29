use std::collections::HashSet;

use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::helper::is_valid_hash;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct LevelData {
    /// Maps to IdentityAccount level used in RWA Token.
    pub level: u8,

    /// Hash generated off-chain.
    #[max_len(32)]
    pub proof_hash: String,
}

#[derive(Default, InitSpace)]
#[account]
pub struct Investor {
    /// Authority keypair allowed to write this account, will match authority or delegate of IdentityRegistry
    /// at time of creation of IdentityAccount.
    pub authority: Pubkey,

    /// IdentityAccount associated with this investor.
    pub identity_account: Pubkey,

    /// Unique ID for Investor, generated off-chain.
    #[max_len(32)]
    pub investor_id: String,

    /// Metadata for investor, generated off-chain.
    #[max_len(32)]
    pub collision_hash: String,

    /// User that last modified this investor. Read from payer of instruction.
    pub last_updated_by: Pubkey,

    /// Levels assigned to investor.
    #[max_len(5)]
    pub levels: Vec<LevelData>,
}

impl Investor {
    pub const SIZE: usize = 525;

    fn are_levels_unique(&self) -> bool {
        let mut seen_levels = HashSet::new();
        self.levels
            .iter()
            .all(|level_data| seen_levels.insert(level_data.level))
    }

    pub fn validate_levels(&self) -> Result<()> {
        // TODO: Check that there's only 1 country level.
        // TODO: Check that there's only 1 status per attribute type.

        // Check that there are a max of 5 levels.
        require_gte!(5, self.levels.len());

        // Check that each level appears only once.
        require!(self.are_levels_unique(), ErrorCode::InvalidLevels);

        // Check that all proof hashes are valid (ascii and <= 32 chars).
        require!(
            self.levels.iter().all(|x| is_valid_hash(&x.proof_hash)),
            ErrorCode::InvalidHash
        );

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_duplicate_levels() {
        let mut investor = Investor {
            ..Default::default()
        };

        investor.levels.push(LevelData {
            level: 1,
            proof_hash: "".to_string(),
        });

        // Shouid pass since level 1 appears only once.
        assert!(investor.validate_levels().is_ok());

        investor.levels.push(LevelData {
            level: 1,
            proof_hash: "".to_string(),
        });

        // Shouid fail since level 1 appears more than once.
        assert!(investor.validate_levels().is_err());
    }

    #[test]
    fn test_invalid_proof_hashes() {
        let mut investor = Investor {
            ..Default::default()
        };

        investor.levels.push(LevelData {
            level: 1,
            proof_hash: "café".to_string(),
        });

        // Shouid fail since proof hash is non ascii.
        assert!(investor.validate_levels().is_err());

        investor.levels.pop();
        investor.levels.push(LevelData {
            level: 1,
            proof_hash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6".to_string(),
        });

        // Shouid pass since proof hash is valid.
        assert!(investor.validate_levels().is_ok());

        investor.levels.push(LevelData {
            level: 3,
            proof_hash: "abca1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6".to_string(),
        });

        // Shouid fail since proof hash is too long.
        assert!(investor.validate_levels().is_err());
    }

    #[test]
    fn test_more_than_5_levels() {
        let mut investor = Investor {
            ..Default::default()
        };

        for i in 0..5 {
            investor.levels.push(LevelData {
                level: i,
                proof_hash: "x".to_string(),
            });
        }
        // Should pass since there are 5 levels.
        assert!(investor.validate_levels().is_ok());

        investor.levels.push(LevelData {
            level: 6,
            proof_hash: "x".to_string(),
        });
        // Should fail since there are more than 5 levels.
        assert!(investor.validate_levels().is_err());
    }
}
