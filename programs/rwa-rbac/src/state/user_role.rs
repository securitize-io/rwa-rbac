use anchor_lang::prelude::*;

use crate::error::ErrorCode;

#[account]
pub struct UserRole {
    /// Controller that user role is designated for.
    pub asset_access_controller: Pubkey,

    /// ID of UserRole. Matches AssetAccessController.user_roles_count at time of creation.
    pub id: u64,

    /// Name of this role.
    pub name: String,

    /// Bitflag of allowed admin instructions.
    pub allowed_admin_ixs: u64,

    /// Bitflag of allowed Medici CPI instructions.
    pub allowed_medici_ixs: u64,

    /// List of users assigned with this role.
    pub users: Vec<Pubkey>,
}

impl UserRole {
    /// Assume name has max size of 64 bytes and includes 8 byte discriminator.
    pub const BASE_SIZE: usize = 152;

    /// Returns true if the user role contains ANY of the admin flags.
    pub fn has_any_admin_flag(&self, flag: AdminFlags) -> bool {
        AdminFlags::from_bits(self.allowed_admin_ixs)
            .unwrap()
            .intersects(flag)
    }

    /// Returns true if the user role contains all of the medici flags.
    pub fn has_medici_flag(&self, flag: MediciFlags) -> bool {
        MediciFlags::from_bits(self.allowed_medici_ixs)
            .unwrap()
            .contains(flag)
    }

    pub fn update_fields(
        &mut self,
        name: String,
        allowed_admin_ixs: u64,
        allowed_medici_ixs: u64,
    ) -> Result<()> {
        if !name.is_ascii() || name.len() > 64 {
            return err!(ErrorCode::InvalidName);
        }

        self.name = name;
        self.allowed_admin_ixs = allowed_admin_ixs;
        self.allowed_medici_ixs = allowed_medici_ixs;

        Ok(())
    }

    /// Add users to users vector if user is not already assigned.
    pub fn assign_users(&mut self, users_to_assign: Vec<Pubkey>) {
        users_to_assign.iter().for_each(|user| {
            if !self.users.contains(user) {
                self.users.push(*user);
            }
        });
    }

    /// Remove users from users vector if the user is currently assigned.
    pub fn remove_users(&mut self, users_to_remove: Vec<Pubkey>) {
        self.users.retain(|user| !users_to_remove.contains(user));
    }

    /// Returns true if there is sufficient space allocated to account to store
    /// all new user addresses.
    pub fn has_sufficient_users_capacity(&self, data_len: usize, to_add: usize) -> bool {
        let storage_capacity = (data_len - Self::BASE_SIZE) / 32;
        self.users.len() + to_add <= storage_capacity
    }
}

bitflags::bitflags! {
  // Internal Instructions
  pub struct AdminFlags: u64 {
      const CREATE_OR_DELETE_USER_ROLE = 1 << 0;
      const MODIFY_USER_ROLE = 1 << 1;
      const ASSIGN_OR_REMOVE_ANY_USER_ROLE = 1 << 2;
      const ASSIGN_OR_REMOVE_CURRENT_USER_ROLE = 1 << 3;
  }

  // CPI Instructions
  pub struct MediciFlags: u64 {
      const UPDATE_ASSET_METADATA = 1 << 0;
      const THAW_TOKEN_ACCOUNT = 1 << 1;
      const FREEZE_TOKEN_ACCOUNT = 1 << 2;
      const ISSUE_TOKENS = 1 << 3;
      const REVOKE_TOKENS = 1 << 4;
      const CLOSE_MINT_ACCOUNT = 1 << 5;
      const UPDATE_INTEREST_BEARING_MINT_RATE = 1 << 6;
      const ATTACH_TO_POLICY_ACCOUNT = 1 << 7;
      const CREATE_POLICY_ACCOUNT = 1 << 8;
      const DETACH_FROM_POLICY_ACCOUNT = 1 << 9;
      const ADD_LEVELS = 1 << 10;
      const REGISTER_INVESTOR = 1 << 11;
      const REMOVE_LEVELS = 1 << 12;
      const REMOVE_INVESTOR = 1 << 13;
      const EDIT_IDENTITY_METADATA = 1 << 14;
      const REFRESH_LEVEL_TO_IDENTITY_ACCOUNT = 1 << 15;
      const ATTACH_WALLET_TO_IDENTITY = 1 << 16;
      const DETACH_WALLET_FROM_IDENTITY = 1 << 17;
      const SEIZE_TOKENS = 1 << 18;
      const CREATE_IDENTITY_ACCOUNT = 1 << 19;
      const CREATE_INVESTOR_LOCKS = 1 << 20;
      const CLOSE_INVESTOR_LOCKS = 1 << 21;
      const ADD_TOKEN_LOCK = 1 << 22;
      const REMOVE_TOKEN_LOCK = 1 << 23;
      const CHANGE_COUNTERS = 1 << 24;
      const CHANGE_COUNTER_LIMITS = 1 << 25;
      const CHANGE_COUNTRY = 1 << 26;
      const CHANGE_MAPPING = 1 << 27;
      const CHANGE_ISSUANCE_POLICIES = 1 << 28;
  }
}
