use crate::{
    constants::IDENTITY_REGISTRY_ID, error::ErrorCode, external_accounts::get_acc_discriminator,
};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct IdentityLevel {
    pub level: u8,
    pub expiry: i64,
}

/// Account layout of IdentityAccount defined by IdentityRegistry program.
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct IdentityAccount {
    /// version of the account
    pub version: u8,
    /// identity registry to which the account belongs
    pub identity_registry: Pubkey,
    /// owner of the identity account
    pub owner: Pubkey,

    pub num_wallets: u16,

    pub country: u8,

    // identity levels corresponding to the user
    pub levels: Vec<IdentityLevel>,
}

impl IdentityAccount {
    pub fn deserialize_checked(info: &AccountInfo<'_>) -> Result<Self> {
        // Check that account is owned by the correct program.
        require_keys_eq!(*info.owner, IDENTITY_REGISTRY_ID);

        // Check account discriminator.
        let v = info.data.borrow();
        require!(
            v.starts_with(&get_acc_discriminator("IdentityAccount")),
            ErrorCode::UnknownAccount
        );

        let acc = Self::try_from_slice(&v[8..])?;
        Ok(acc)
    }
}
