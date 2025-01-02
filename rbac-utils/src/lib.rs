pub mod constants;
pub mod external_accounts;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction::transfer;
use hex::FromHex;
use sha256::digest;

/// Generates anchor instruction discriminator for function name.
pub fn get_discriminator(function_name: &str) -> Vec<u8> {
    let full_function_name = String::from("global:") + function_name;
    let function_discriminator = String::from(&digest(full_function_name)[0..16]);
    Vec::<u8>::from_hex(function_discriminator).unwrap()
}

/// Generates anchor instruction discriminator for account name.
pub fn get_acc_discriminator(account_name: &str) -> Vec<u8> {
    let full_account_name = String::from("account:") + account_name;
    // 16 char hex string converts to 8 bytes
    let function_discriminator = String::from(&digest(full_account_name)[0..16]);
    Vec::<u8>::from_hex(function_discriminator).unwrap()
}

/// Checks if a string is a valid hash. In this system, we only check if the string
/// is ascii char and has length of <= 32.
///
/// For context, there are no limitations on string length or formatting in the EVM contract.
/// On the client side, these strings are always generated as a 32 character hex string.
pub fn is_valid_hash(hash: &str) -> bool {
    hash.is_ascii() && hash.len() <= 32
}

/// Calculates additional lamports needed for account realloc and transfers them payer
/// from to target.
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
