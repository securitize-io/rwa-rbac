use anchor_lang::{error::ErrorCode, prelude::*};

use crate::constants::ASSET_CONTROLLER_ID;

/// Wire layout of the token program's pending-operation payload. Variant order is part of its ABI.
#[derive(AnchorSerialize, AnchorDeserialize, Debug, PartialEq, Eq)]
pub enum OperationData {
    Mint {
        amount: u64,
        issuance_timestamp: i64,
    },
    Burn {
        amount: u64,
        reason: String,
    },
}

/// Account layout owned by the token asset-controller program.
#[derive(AnchorSerialize, AnchorDeserialize, Debug, PartialEq, Eq)]
pub struct PendingOperation {
    pub asset_mint: Pubkey,
    pub wallet: Pubkey,
    pub identity_account: Pubkey,
    pub token_account: Pubkey,
    pub id: [u8; 32],
    pub data: OperationData,
    pub proposer: Pubkey,
    pub rent_payer: Pubkey,
    pub effective_at: i64,
    pub expires_at: i64,
}

impl PendingOperation {
    const DISCRIMINATOR: [u8; 8] = [124, 146, 84, 123, 121, 210, 217, 118];

    pub fn deserialize_checked(info: &AccountInfo<'_>) -> Result<Self> {
        require_keys_eq!(
            *info.owner,
            ASSET_CONTROLLER_ID,
            ErrorCode::AccountOwnedByWrongProgram
        );
        let data = info.try_borrow_data()?;
        require!(
            data.starts_with(&Self::DISCRIMINATOR),
            ErrorCode::AccountDiscriminatorMismatch
        );
        // The token program allocates the maximum enum size. Short reasons/mints leave padding.
        let account = Self::deserialize(&mut &data[Self::DISCRIMINATOR.len()..])
            .map_err(|_| error!(ErrorCode::AccountDidNotDeserialize))?;
        let (address, _) = Pubkey::find_program_address(
            &[
                b"pending_operation",
                account.asset_mint.as_ref(),
                &account.id,
            ],
            &ASSET_CONTROLLER_ID,
        );
        require_keys_eq!(info.key(), address, ErrorCode::ConstraintSeeds);
        Ok(account)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture(data: OperationData) -> (Pubkey, PendingOperation, Vec<u8>) {
        let account = PendingOperation {
            asset_mint: Pubkey::new_unique(),
            wallet: Pubkey::new_unique(),
            identity_account: Pubkey::new_unique(),
            token_account: Pubkey::new_unique(),
            id: [42; 32],
            data,
            proposer: Pubkey::new_unique(),
            rent_payer: Pubkey::new_unique(),
            effective_at: 123,
            expires_at: 456,
        };
        let address = Pubkey::find_program_address(
            &[
                b"pending_operation",
                account.asset_mint.as_ref(),
                &account.id,
            ],
            &ASSET_CONTROLLER_ID,
        )
        .0;
        let mut bytes = PendingOperation::DISCRIMINATOR.to_vec();
        account.serialize(&mut bytes).unwrap();
        (address, account, bytes)
    }

    fn decode(address: Pubkey, owner: Pubkey, mut bytes: Vec<u8>) -> Result<PendingOperation> {
        let mut lamports = 1;
        let info = AccountInfo::new(
            &address,
            false,
            false,
            &mut lamports,
            &mut bytes,
            &owner,
            false,
        );
        PendingOperation::deserialize_checked(&info)
    }

    #[test]
    fn decodes_mints_and_variable_burns_with_allocated_padding() {
        for data in [
            OperationData::Mint {
                amount: 9,
                issuance_timestamp: 12,
            },
            OperationData::Burn {
                amount: 8,
                reason: String::new(),
            },
            OperationData::Burn {
                amount: 7,
                reason: "x".repeat(256),
            },
        ] {
            let (address, account, mut bytes) = fixture(data);
            bytes.resize(517, 0xa5);
            assert_eq!(
                decode(address, ASSET_CONTROLLER_ID, bytes).unwrap(),
                account
            );
        }
    }

    #[test]
    fn rejects_wrong_owner_discriminator_address_and_truncated_data() {
        let (address, _, bytes) = fixture(OperationData::Mint {
            amount: 9,
            issuance_timestamp: 12,
        });
        assert!(decode(address, Pubkey::new_unique(), bytes.clone()).is_err());
        assert!(decode(Pubkey::new_unique(), ASSET_CONTROLLER_ID, bytes.clone()).is_err());
        let mut wrong_discriminator = bytes.clone();
        wrong_discriminator[0] ^= 1;
        assert!(decode(address, ASSET_CONTROLLER_ID, wrong_discriminator).is_err());
        for length in [0, 7, 8, bytes.len() - 1] {
            assert!(decode(address, ASSET_CONTROLLER_ID, bytes[..length].to_vec()).is_err());
        }
    }
}
