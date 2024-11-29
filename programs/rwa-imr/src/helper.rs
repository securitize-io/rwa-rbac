use hex::FromHex;
use sha256::digest;

/// Generates anchor instruction discriminator for function name.
pub fn get_discriminator(function_name: &str) -> Vec<u8> {
    let full_function_name = String::from("global:") + function_name;
    let function_discriminator = String::from(&digest(full_function_name)[0..16]);
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
