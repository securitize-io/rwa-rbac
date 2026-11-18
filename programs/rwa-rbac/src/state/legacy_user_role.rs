//! Temporary V1 compatibility. Remove after all deployed roles have been migrated.
use super::UserRole;
use anchor_lang::prelude::*;

// Preserve the discriminator of the original deployed `UserRole` type.
#[account(discriminator = [62, 252, 194, 137, 183, 165, 147, 28])]
pub struct LegacyUserRole {
    pub asset_access_controller: Pubkey,
    pub id: u64,
    pub name: String,
    pub allowed_admin_ixs: u64,
    pub allowed_medici_ixs: u64,
    pub is_master_role: bool,
    pub users: Vec<Pubkey>,
}

impl From<LegacyUserRole> for UserRole {
    fn from(old: LegacyUserRole) -> Self {
        Self {
            asset_access_controller: old.asset_access_controller,
            id: old.id,
            version: 1,
            gate_authority: None,
            name: old.name,
            allowed_admin_ixs: old.allowed_admin_ixs,
            allowed_medici_ixs: old.allowed_medici_ixs,
            is_master_role: old.is_master_role,
            users: old.users,
        }
    }
}

impl Owner for UserRole {
    fn owner() -> Pubkey {
        crate::ID
    }
}

impl Discriminator for UserRole {
    // sha256("account:UserRoleV2")[..8]. Explicit so cleanup can retain this ABI.
    const DISCRIMINATOR: &'static [u8] = &[125, 238, 187, 240, 33, 212, 164, 28];
}

impl AccountDeserialize for UserRole {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self> {
        if buf.starts_with(LegacyUserRole::DISCRIMINATOR) {
            return LegacyUserRole::try_deserialize(buf).map(Into::into);
        }
        require!(
            buf.starts_with(Self::DISCRIMINATOR),
            crate::error::ErrorCode::UnknownAccount
        );
        let role = Self::deserialize(&mut &buf[Self::DISCRIMINATOR.len()..])?;
        require_eq!(
            role.version,
            Self::VERSION,
            crate::error::ErrorCode::UnknownAccount
        );
        Ok(role)
    }

    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        // Used by Anchor init: new accounts always use V2.
        require!(
            buf.len() >= Self::DISCRIMINATOR.len(),
            crate::error::ErrorCode::UnknownAccount
        );
        let mut role = Self::deserialize(&mut &buf[Self::DISCRIMINATOR.len()..])?;
        role.version = Self::VERSION;
        Ok(role)
    }
}

impl AccountSerialize for UserRole {
    fn try_serialize<W: std::io::Write>(&self, writer: &mut W) -> Result<()> {
        if self.is_legacy() {
            require!(
                self.gate_authority.is_none(),
                crate::error::ErrorCode::MigrationRequired
            );
            writer.write_all(LegacyUserRole::DISCRIMINATOR)?;
            // Borrow fields instead of cloning a potentially large users vector.
            self.asset_access_controller.serialize(writer)?;
            self.id.serialize(writer)?;
            self.name.serialize(writer)?;
            self.allowed_admin_ixs.serialize(writer)?;
            self.allowed_medici_ixs.serialize(writer)?;
            self.is_master_role.serialize(writer)?;
            self.users.serialize(writer)?;
        } else {
            require_eq!(
                self.version,
                Self::VERSION,
                crate::error::ErrorCode::UnknownAccount
            );
            writer.write_all(Self::DISCRIMINATOR)?;
            self.serialize(writer)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn legacy(name: &str, users: usize) -> Vec<u8> {
        let old = LegacyUserRole {
            asset_access_controller: Pubkey::new_unique(),
            id: 1,
            name: name.into(),
            allowed_admin_ixs: 0,
            allowed_medici_ixs: 0,
            is_master_role: false,
            users: vec![Pubkey::new_unique(); users],
        };
        let mut data = Vec::new();
        old.try_serialize(&mut data).unwrap();
        data.extend([0xa5; 80]);
        data
    }

    #[test]
    fn legacy_mutations_preserve_format_despite_nonzero_padding() {
        for name in ["", "a", &"x".repeat(64)] {
            let data = legacy(name, 100);
            let mut role = UserRole::try_deserialize(&mut data.as_slice()).unwrap();
            assert!(role.is_legacy());
            assert_eq!(role.gate_authority, None);
            role.name = "edited".into();
            role.users.push(Pubkey::new_unique());
            let mut saved = Vec::new();
            role.try_serialize(&mut saved).unwrap();
            let old = LegacyUserRole::try_deserialize(&mut saved.as_slice()).unwrap();
            assert_eq!(old.name, "edited");
            assert_eq!(old.users, role.users);
            role.gate_authority = Some(Pubkey::new_unique());
            assert!(role.try_serialize(&mut Vec::new()).is_err());
        }
    }

    #[test]
    fn legacy_maximum_name_requires_137_bytes_before_users() {
        for users in [0, 1, 100] {
            let role =
                UserRole::try_deserialize(&mut legacy(&"x".repeat(64), users).as_slice()).unwrap();
            let mut historical_allocation = vec![0; 136 + users * 32];
            assert!(
                role.try_serialize(&mut historical_allocation.as_mut_slice())
                    .is_err()
            );
            let mut corrected_allocation = vec![0; role.space_for_users(users)];
            role.try_serialize(&mut corrected_allocation.as_mut_slice())
                .unwrap();
        }
    }

    #[test]
    fn v2_fixed_fields_have_stable_offsets_before_variable_fields() {
        for gate in [None, Some(Pubkey::new_unique())] {
            for name in ["", &"x".repeat(64)] {
                let mut role = UserRole::from(
                    LegacyUserRole::try_deserialize(&mut legacy(name, 3).as_slice()).unwrap(),
                );
                role.version = UserRole::VERSION;
                role.gate_authority = gate;
                role.allowed_admin_ixs = 2;
                role.allowed_medici_ixs = 8;
                role.is_master_role = true;
                let mut data = Vec::new();
                role.try_serialize(&mut data).unwrap();
                assert_eq!(&data[49..57], &2u64.to_le_bytes());
                assert_eq!(&data[57..65], &8u64.to_le_bytes());
                assert_eq!(data[65], 1);
                assert_eq!(data[66], u8::from(gate.is_some()));
                let name_offset = if gate.is_some() { 99 } else { 67 };
                assert_eq!(
                    &data[name_offset..name_offset + 4],
                    &(name.len() as u32).to_le_bytes()
                );
                let decoded = UserRole::try_deserialize(&mut data.as_slice()).unwrap();
                assert_eq!(decoded.name, name);
                assert_eq!(decoded.users, role.users);
            }
        }
    }

    #[test]
    fn current_layout_and_version_are_checked_without_legacy_fallback() {
        let mut role = UserRole::try_deserialize(&mut legacy("test", 0).as_slice()).unwrap();
        role.version = UserRole::VERSION;
        role.gate_authority = Some(Pubkey::new_unique());
        let mut data = Vec::new();
        role.try_serialize(&mut data).unwrap();
        assert_eq!(data.len(), UserRole::BASE_SIZE - 60);
        assert_eq!(
            UserRole::try_deserialize(&mut data.as_slice())
                .unwrap()
                .gate_authority,
            role.gate_authority
        );
        data[48] = 3; // Version follows the discriminator, controller, and ID.
        assert!(UserRole::try_deserialize(&mut data.as_slice()).is_err());
        assert!(UserRole::try_deserialize(&mut &data[..8]).is_err());
        data[..8].fill(0xff);
        assert!(UserRole::try_deserialize(&mut data.as_slice()).is_err());
    }
}
