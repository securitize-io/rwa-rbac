use anchor_lang::prelude::*;

use crate::error::ErrorCode;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Lock {
    /// Amount of tokens to lock.
    pub value: u64,

    /// Timestamp from which the lock will be inactive. If value is 0, the lock
    /// will remain active until removed.
    pub release_time: i64,

    /// Reason code for locking.
    pub reason_code: u64,

    /// Detailed reason for the lock. Since string has no length limit, we calculate
    /// total space needed dynamically at time of resizing.
    #[max_len(0)]
    pub reason_string: String,
}

impl Lock {
    // A lock is expired when release_time is not zero and is behind or the same as current time.
    pub fn has_expired(&self) -> Result<bool> {
        Ok(self.release_time != 0 && self.release_time <= Clock::get()?.unix_timestamp)
    }

    pub fn validate(&self) -> Result<()> {
        // Return error if release_time has expired (indefinite expiry value of 0 allowed)
        if self.has_expired()? {
            return err!(ErrorCode::InvalidReleaseTime);
        }

        if !self.reason_string.is_ascii() {
            return err!(ErrorCode::InvalidReasonString);
        }

        if self.value == 0 {
            return err!(ErrorCode::InvalidLockValue);
        }

        Ok(())
    }
}

#[derive(InitSpace)]
#[account]
pub struct InvestorLocks {
    /// Address of Investor account.
    pub investor: Pubkey,

    /// Wallet (owned by the Investor) that is locked.
    pub wallet: Pubkey,

    /// Account storing locked tokens for wallet. Will be frozen upon initialization of
    /// investor locks.
    pub locked_token_account: Pubkey,

    #[max_len(0)] // Init 0 space for vec. Account will be resized on adding on locks.
    pub locks: Vec<Lock>,
}

impl InvestorLocks {
    // Returns total space used by InvestorLocks.
    pub fn space_used(&self) -> usize {
        let mut space = 8 + InvestorLocks::INIT_SPACE;

        for lock in &self.locks {
            space += Lock::INIT_SPACE + lock.reason_string.len();
        }
        space
    }
}
