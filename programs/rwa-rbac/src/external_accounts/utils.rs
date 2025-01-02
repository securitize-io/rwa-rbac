use hex::FromHex;
use sha256::digest;

pub fn get_acc_discriminator(account_name: &str) -> Vec<u8> {
    let full_account_name = String::from("account:") + account_name;
    // 16 char hex string converts to 8 bytes
    let function_discriminator = String::from(&digest(full_account_name)[0..16]);
    Vec::<u8>::from_hex(function_discriminator).unwrap()
}
