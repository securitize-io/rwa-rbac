use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction::transfer;
use hex::FromHex;
use sha256::digest;

use crate::{AdminFlags, AssetAccessController, MediciFlags, UserRole};

/// Check if user matches controller admin or has role with matching admin flag.
pub fn verify_admin_signer(
    user: Pubkey,
    asset_access_controller: &AssetAccessController,
    user_role: Option<Account<UserRole>>,
    matching_flag: AdminFlags,
) -> Result<()> {
    if user != asset_access_controller.admin {
        let user_role = user_role.unwrap();
        let is_authorized =
            user_role.has_admin_flag(matching_flag) && user_role.users.contains(&user);
        if !is_authorized {
            panic!("Invalid signer")
        }
    }
    Ok(())
}

/// Check if user matches controller admin or has role with matching medici flag.
pub fn verify_medici_signer(
    user: Pubkey,
    asset_access_controller: &AssetAccessController,
    user_role: Option<Account<UserRole>>,
    matching_flag: MediciFlags,
) -> Result<()> {
    if user != asset_access_controller.admin {
        let user_role = user_role.unwrap();
        let is_authorized =
            user_role.has_medici_flag(matching_flag) && user_role.users.contains(&user);
        if !is_authorized {
            panic!("Invalid signer")
        }
    }
    Ok(())
}

// Calculates additional lamports needed for account realloc and transfers them payer
// from to target.
pub fn transfer_lamports_for_realloc<'info>(
    payer: AccountInfo<'info>,
    target: AccountInfo<'info>,
    new_len: usize,
) -> Result<()> {
    // Calculate additional lamports needed for new account size.
    let rent = Rent::get()?;
    let new_minimum_balance = rent.minimum_balance(new_len);
    let lamports_diff = new_minimum_balance.saturating_sub(target.lamports());

    // Transfer additional lamports to target.
    if lamports_diff > 0 {
        let ix = transfer(payer.key, target.key, lamports_diff);
        invoke(&ix, &[payer, target])?;
    }
    Ok(())
}

/// Generates anchor instruction discriminator for function name.
pub fn get_discriminator(function_name: &str) -> Vec<u8> {
    let full_function_name = String::from("global:") + function_name;
    let function_discriminator = String::from(&digest(full_function_name)[0..16]);
    Vec::<u8>::from_hex(function_discriminator).unwrap()
}
