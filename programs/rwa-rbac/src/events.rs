use anchor_lang::prelude::*;

#[event]
pub struct AssignUserRoleEvent {
    pub addresses: Vec<Pubkey>,
    pub role: String,
    pub role_id: u64,
    pub sender: Pubkey,
    pub asset_mint: Pubkey,
}

#[event]
pub struct RemoveUserRoleEvent {
    pub addresses: Vec<Pubkey>,
    pub role: String,
    pub role_id: u64,
    pub sender: Pubkey,
    pub asset_mint: Pubkey,
}

/// Human authorization accompanying the token program's authoritative lifecycle event.
#[event]
pub struct TokenOperationProposed {
    pub user: Pubkey,
    pub role_id: u64,
    pub asset_mint: Pubkey,
    pub operation_id: [u8; 32],
}

/// Human authorization accompanying the token program's authoritative lifecycle event.
#[event]
pub struct TokenOperationExecuted {
    pub user: Pubkey,
    pub role_id: u64,
    pub asset_mint: Pubkey,
    pub operation_id: [u8; 32],
}

/// Human authorization accompanying the token program's authoritative lifecycle event.
#[event]
pub struct TokenOperationCancelled {
    pub user: Pubkey,
    pub role_id: u64,
    pub asset_mint: Pubkey,
    pub operation_id: [u8; 32],
}
