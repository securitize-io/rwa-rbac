use anchor_lang::prelude::*;

#[account]
pub struct IdentityToInvestor {
    /// IdentityAccount associated with this investor.
    pub identity_account: Pubkey,

    /// Investor account associated with this identity.
    pub investor: Pubkey,
}
