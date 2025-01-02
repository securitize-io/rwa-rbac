use anchor_lang::{prelude::Pubkey, pubkey};

pub const POLICY_ENGINE_ID: Pubkey = pubkey!("4wyusm2nxncvNyiVej5mZ1k1mVPhfG41oNvHx4BWiYMq");
pub const ASSET_CONTROLLER_ID: Pubkey = pubkey!("2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa");
pub const DATA_REGISTRY_ID: Pubkey = pubkey!("8Bp1xoRscjuHoG1KT41zAaujGTx2fyB2uzTt8GTeWZX8");
pub const IDENTITY_METADATA_REGISTRY_ID: Pubkey =
    pubkey!("6g7C5Re5hMY7Yi4dWGCEXWvzysCEePybo7jgTNBMsuL5");
pub const IDENTITY_REGISTRY_ID: Pubkey = pubkey!("7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ");
pub const TOKEN_LOCKS_ID: Pubkey = pubkey!("HKYfwoKujgGHJdHjDAxW8pqqNLmVSe9ukbua8tnQEFPz");

#[allow(non_camel_case_types)]
#[derive(PartialEq, Clone, Copy)]
#[repr(u8)]
pub enum Level {
    Investor = 1,
    KYC_APPROVED = 5,
    ACCREDITED = 6,
    QUALIFIED = 7,
    PROFESSIONAL = 8,
    US = 10,
    EU = 11,
    JP = 12,
    ACCREDITED_PENDING = 20,
    QUALIFIED_PENDING = 21,
    PROFESSIONAL_PENDING = 22,
    KYC_APPROVED_PENDING = 23,
    ACCREDITED_REJECTED = 25,
    QUALIFIED_REJECTED = 26,
    PROFESSIONAL_REJECTED = 27,
    KYC_APPROVED_REJECTED = 28,
    PLATFORM_WALLET = 30,
    EXCHANGE_WALLET = 31,
    ISSUER_WALLET = 32,
}
