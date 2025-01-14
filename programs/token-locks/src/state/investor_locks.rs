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

    /// Wallet holding the locked tokens (matches Investor's owner).
    pub wallet: Pubkey,

    /// Account storing locked tokens for wallet. Will be frozen upon initialization of
    /// InvestorLocks.
    pub locked_token_account: Pubkey,

    #[max_len(0)] // Init 0 space for vec. Account will be resized on adding of locks.
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

    pub fn remove_locks(&mut self, indices: Vec<usize>) -> Result<()> {
        // Sort indices in descending order.
        let mut sorted_indices = indices;
        sorted_indices.sort_unstable_by(|a, b| b.cmp(a));

        // Remove locks in descending order so it would not be affected by shifting.
        for &index in &sorted_indices {
            self.locks.remove(index);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use anchor_lang::prelude::Pubkey;

    use super::{InvestorLocks, Lock};

    fn build_investor_locks(lock_count: u8) -> InvestorLocks {
        let mut investor_locks = InvestorLocks {
            investor: Pubkey::new_unique(),
            wallet: Pubkey::new_unique(),
            locked_token_account: Pubkey::new_unique(),
            locks: vec![],
        };

        for i in 0..lock_count {
            investor_locks.locks.push(Lock {
                reason_code: 0,
                reason_string: String::new(),
                value: u64::from(i),
                release_time: 123,
            });
        }

        investor_locks
    }

    #[test]
    fn test_removing_locks() {
        let mut investor_locks = build_investor_locks(5);
        investor_locks.remove_locks(vec![2, 4]).unwrap();

        assert_eq!(investor_locks.locks.len(), 3);
        assert_eq!(investor_locks.locks[0].value, 0);
        assert_eq!(investor_locks.locks[1].value, 1);
        assert_eq!(investor_locks.locks[2].value, 3);

        investor_locks.remove_locks(vec![1, 0]).unwrap();
        assert_eq!(investor_locks.locks.len(), 1);
        assert_eq!(investor_locks.locks[0].value, 3);

        investor_locks.remove_locks(vec![0]).unwrap();
        assert_eq!(investor_locks.locks.len(), 0);
    }
}
