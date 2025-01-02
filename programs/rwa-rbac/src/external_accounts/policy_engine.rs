use anchor_lang::{prelude::*, AnchorSerialize};

use crate::{
    constants::POLICY_ENGINE_ID, error::ErrorCode, external_accounts::get_acc_discriminator,
};

#[derive(InitSpace, AnchorDeserialize, AnchorSerialize)]
pub struct PartialPolicyEngineAccount {
    /// version
    pub version: u8,
    /// asset mint
    pub asset_mint: Pubkey,
    /// authority of the registry
    pub authority: Pubkey,
    /// policy delegate
    pub delegate: Pubkey,
    /// max timeframe of all the policies
    pub max_timeframe: i64,
    /// enforce policy issuance
    pub enforce_policy_issuance: bool,
    /// generic mapping for levels
    pub mapping: [u8; 256],
    /// policies to apply on issuance
    /// these are partially for storage only
    pub issuance_policies: IssuancePolicies,
    // Fields after are not included...
}

impl PartialPolicyEngineAccount {
    pub fn deserialize_checked(info: &AccountInfo<'_>) -> Result<Self> {
        // Check that account is owned by the correct program.
        require_keys_eq!(*info.owner, POLICY_ENGINE_ID);

        // Check account discriminator.
        let v = info.data.borrow();
        require!(
            v.starts_with(&get_acc_discriminator("PolicyEngineAccount")),
            ErrorCode::UnknownAccount
        );

        let end_len = 8 + PartialPolicyEngineAccount::INIT_SPACE;
        let acc = Self::try_from_slice(&v[8..end_len])?;
        Ok(acc)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Debug)]
pub struct IssuancePolicies {
    pub disallow_backdating: bool,
    pub max_supply: u64,
    pub us_lock_period: u64,
    pub non_us_lock_period: u64,
}
