use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_error::ProgramError;

use crate::{constants::IDENTITY_REGISTRY_ID, get_acc_discriminator};

/// Account layout of WalletIdentity defined by IdentityRegistry program.
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WalletIdentity {
    pub identity_account: Pubkey,
    pub wallet: Pubkey,
}

impl WalletIdentity {
    pub fn deserialize_checked(info: &AccountInfo<'_>) -> Result<Self> {
        // Check that account is owned by the correct program.
        require_keys_eq!(*info.owner, IDENTITY_REGISTRY_ID);

        // Check account discriminator.
        let v = info.data.borrow();
        if !v.starts_with(&get_acc_discriminator("WalletIdentity")) {
            return Err(ProgramError::InvalidAccountData.into());
        }

        let acc = Self::try_from_slice(&v[8..])?;
        Ok(acc)
    }
}
