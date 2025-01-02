#![allow(ambiguous_glob_reexports)]

pub mod constants;
pub mod error;
pub mod helper;
pub mod instructions;
pub mod macros;
pub mod state;

pub use helper::*;
pub use instructions::*;
pub use state::*;

use anchor_lang::prelude::*;

declare_id!("AzGap3q8fXV1gHPWpAuMFqkpCewvuEY5GrkhCz86ZkDb");

#[program]
pub mod rwa_rbac {
    use super::*;

    pub fn create_controller(
        ctx: Context<CreateAssetAccessController>,
        unique_seed: Pubkey,
    ) -> Result<()> {
        instructions::create_controller::handler(ctx, unique_seed)
    }

    pub fn update_controller_admin(
        ctx: Context<UpdateControllerAdmin>,
        new_admin: Pubkey,
    ) -> Result<()> {
        instructions::update_controller_admin::handler(ctx, new_admin)
    }

    pub fn withdraw_excess_rent(ctx: Context<WithdrawExcessRent>) -> Result<()> {
        instructions::withdraw_excess_rent::handler(ctx)
    }

    pub fn create_user_role(
        ctx: Context<CreateUserRole>,
        name: String,
        allowed_admin_ixs: u64,
        allowed_medici_ixs: u64,
    ) -> Result<()> {
        instructions::create_user_role::handler(ctx, name, allowed_admin_ixs, allowed_medici_ixs)
    }

    pub fn modify_user_role(
        ctx: Context<ModifyUserRole>,
        name: String,
        allowed_admin_ixs: u64,
        allowed_medici_ixs: u64,
    ) -> Result<()> {
        instructions::modify_user_role::handler(ctx, name, allowed_admin_ixs, allowed_medici_ixs)
    }

    pub fn delete_user_role(ctx: Context<DeleteUserRole>) -> Result<()> {
        instructions::delete_user_role::handler(ctx)
    }

    pub fn assign_user_role(
        ctx: Context<AssignUserRole>,
        users_to_assign: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::assign_user_role::handler(ctx, users_to_assign)
    }

    pub fn remove_user_role(
        ctx: Context<RemoveUserRole>,
        users_to_remove: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::remove_user_role::handler(ctx, users_to_remove)
    }

    pub fn issue_tokens(ctx: Context<IssueTokens>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::issue_tokens::handler(ctx, cpi_data)
    }

    pub fn update_asset_metadata(
        ctx: Context<UpdateAssetMetadata>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::update_asset_metadata::handler(ctx, cpi_data)
    }

    pub fn thaw_token_account(ctx: Context<ThawTokenAccount>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::thaw_token_account::handler(ctx, cpi_data)
    }

    pub fn freeze_token_account(ctx: Context<FreezeTokenAccount>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::freeze_token_account::handler(ctx, cpi_data)
    }

    pub fn seize_tokens<'info>(
        ctx: Context<'_, '_, '_, 'info, SeizeTokens<'info>>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::seize_tokens::handler(ctx, cpi_data)
    }

    pub fn revoke_tokens<'info>(
        ctx: Context<'_, '_, '_, 'info, RevokeTokens<'info>>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::revoke_tokens::handler(ctx, cpi_data)
    }

    pub fn close_mint_account(ctx: Context<CloseMintAccount>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::close_mint_account::handler(ctx, cpi_data)
    }

    pub fn update_interest_bearing_mint_rate(
        ctx: Context<UpdateInterestBearingMintRate>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::update_interest_bearing_mint_rate::handler(ctx, cpi_data)
    }

    pub fn attach_to_policy_engine(
        ctx: Context<AttachToPolicyEngine>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::attach_to_policy_engine::handler(ctx, cpi_data)
    }

    pub fn change_counters(ctx: Context<ChangeCounters>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::change_counters::handler(ctx, cpi_data)
    }

    pub fn change_counter_limits(
        ctx: Context<ChangeCounterLimits>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::change_counter_limits::handler(ctx, cpi_data)
    }

    pub fn detach_from_policy_engine(
        ctx: Context<DetachFromPolicyEngine>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::detach_from_policy_engine::handler(ctx, cpi_data)
    }

    pub fn register_investor(ctx: Context<RegisterInvestor>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::register_investor::handler(ctx, cpi_data)
    }

    pub fn remove_investor(ctx: Context<RemoveInvestor>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::remove_investor::handler(ctx, cpi_data)
    }

    pub fn add_levels(ctx: Context<AddLevels>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::add_levels::handler(ctx, cpi_data)
    }

    pub fn remove_levels(ctx: Context<RemoveLevels>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::remove_levels::handler(ctx, cpi_data)
    }

    pub fn refresh_level_to_identity_account(
        ctx: Context<RefreshLevelToIdentityAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::refresh_level_to_identity_account::handler(ctx, cpi_data)
    }

    pub fn attach_wallet_to_identity(
        ctx: Context<AttachWalletToIdentity>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::attach_wallet_to_identity::handler(ctx, cpi_data)
    }

    pub fn detach_wallet_from_identity(
        ctx: Context<DetachWalletFromIdentity>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::detach_wallet_from_identity::handler(ctx, cpi_data)
    }

    pub fn create_investor_locks(ctx: Context<CreateInvestorLocks>, wallet: Pubkey) -> Result<()> {
        instructions::create_investor_locks::handler(ctx, wallet)
    }

    pub fn close_investor_locks(ctx: Context<CloseInvestorLocks>) -> Result<()> {
        instructions::close_investor_locks::handler(ctx)
    }

    pub fn add_token_lock<'info>(
        ctx: Context<'_, '_, '_, 'info, AddTokenLock<'info>>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::add_token_lock::handler(ctx, cpi_data)
    }

    pub fn remove_token_lock<'info>(
        ctx: Context<'_, '_, '_, 'info, RemoveTokenLock<'info>>,
        index: u64,
    ) -> Result<()> {
        instructions::remove_token_lock::handler(ctx, index)
    }

    pub fn create_identity_account(
        ctx: Context<CreateIdentityAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::create_identity_account::handler(ctx, cpi_data)
    }

    pub fn add_level_to_identity_account(
        ctx: Context<AddLevelToIdentityAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::add_level_to_identity_account::handler(ctx, cpi_data)
    }

    pub fn remove_level_from_identity_account(
        ctx: Context<RemoveLevelFromIdentityAccount>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::remove_level_from_identity_account::handler(ctx, cpi_data)
    }

    pub fn change_country(ctx: Context<ChangeCountry>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::change_country::handler(ctx, cpi_data)
    }

    pub fn change_mapping(ctx: Context<ChangeMapping>, cpi_data: Vec<u8>) -> Result<()> {
        instructions::change_mapping::handler(ctx, cpi_data)
    }

    pub fn change_issuance_policies(
        ctx: Context<ChangeIssuancePolicies>,
        cpi_data: Vec<u8>,
    ) -> Result<()> {
        instructions::change_issuance_policies::handler(ctx, cpi_data)
    }
}
