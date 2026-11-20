import { BorshAccountsCoder, Idl, IdlAccounts, Program } from '@anchor-lang/core';
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { RwaRbac } from '../types/generated/rwa_rbac';
import { GateAuthorityProof } from '../types/instructions';

export const LEGACY_USER_ROLE_DISCRIMINATOR = [62, 252, 194, 137, 183, 165, 147, 28];
export type UserRoleAccount = IdlAccounts<RwaRbac>['userRole'];
export type UserRoleEntry = { publicKey: PublicKey; account: UserRoleAccount };
export type MigrationGate = { authority: PublicKey; proof: GateAuthorityProof };
export type MigrateUserRoleArgs = {
  payer: PublicKey;
  user: PublicKey;
  assetAccessController: PublicKey;
  userRole: PublicKey;
  authorizedUserRole?: PublicKey;
  gateAuthority?: PublicKey;
  newGate: MigrationGate | null;
};
export type PlanUserRoleMigrationArgs = Omit<MigrateUserRoleArgs, 'userRole' | 'newGate'> & {
  /** Explicit configuration for each legacy role, keyed by its address. Null means no gate. */
  gates: Record<string, MigrationGate | null>;
};
export type UserRoleMigrationPlan = {
  alreadyMigrated: PublicKey[];
  pending: { userRole: PublicKey; instruction: TransactionInstruction }[];
};

/** Role reads support V1 during migration without replacing Anchor's standard coder. */
export class UserRoles {
  private readonly legacyCoder: BorshAccountsCoder;

  constructor(private readonly program: Program<RwaRbac>) {
    const idl: Idl = JSON.parse(JSON.stringify(program.idl));
    idl.accounts = [{ name: 'userRole', discriminator: LEGACY_USER_ROLE_DISCRIMINATOR }];
    const role = idl.types!.find((type) => type.name === 'userRole')!;
    // The deployed V1 wire order is independent of the current role layout.
    role.type = {
      kind: 'struct',
      fields: [
        { name: 'assetAccessController', type: 'pubkey' },
        { name: 'id', type: 'u64' },
        { name: 'name', type: 'string' },
        { name: 'allowedAdminIxs', type: 'u64' },
        { name: 'allowedMediciIxs', type: 'u64' },
        { name: 'isMasterRole', type: 'bool' },
        { name: 'users', type: { vec: 'pubkey' } },
      ],
    };
    this.legacyCoder = new BorshAccountsCoder(idl);
  }

  decode(data: Buffer): UserRoleAccount {
    if (data.subarray(0, 8).equals(Buffer.from(LEGACY_USER_ROLE_DISCRIMINATOR))) {
      return { ...this.legacyCoder.decode('userRole', data), version: 1, gateAuthority: null };
    }
    const role = this.program.coder.accounts.decode<UserRoleAccount>('userRole', data);
    if (role.version !== 2) throw new Error(`Unsupported UserRole version: ${role.version}`);
    return role;
  }

  async fetch(address: PublicKey): Promise<UserRoleAccount> {
    const info = await this.program.provider.connection.getAccountInfo(address);
    if (!info || !info.owner.equals(this.program.programId)) throw new Error(`Invalid UserRole owner: ${address}`);
    return this.decode(info.data);
  }

  /** Both layouts retain the controller at offset 8. Deleted role IDs need no special handling. */
  async all(controller: PublicKey): Promise<UserRoleEntry[]> {
    const current = this.program.idl.accounts!.find((account) => account.name === 'userRole')!.discriminator;
    const discriminators = [LEGACY_USER_ROLE_DISCRIMINATOR, current].map((value) => Buffer.from(value));
    const roles = await this.program.provider.connection.getProgramAccounts(this.program.programId, {
      filters: [{ memcmp: { offset: 8, bytes: controller.toBase58() } }],
    });
    return roles
      .filter(({ account }) => discriminators.some((value) => account.data.subarray(0, 8).equals(value)))
      .map(({ pubkey, account }) => ({ publicKey: pubkey, account: this.decode(account.data) }))
      .sort((a, b) => a.account.id.cmp(b.account.id));
  }

  async migrateIxn(args: MigrateUserRoleArgs): Promise<TransactionInstruction> {
    return this.program.methods
      .migrateUserRole(
        args.newGate?.authority ?? null,
        args.newGate
          ? { ...args.newGate.proof, seeds: args.newGate.proof.seeds.map((seed) => Buffer.from(seed)) }
          : null
      )
      .accountsStrict({
        payer: args.payer,
        user: args.user,
        assetAccessController: args.assetAccessController,
        userRole: args.userRole,
        authorizedUserRole: args.authorizedUserRole ?? null,
        gateAuthority: args.gateAuthority ?? null,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /** Build only. The caller controls batching, timelock approval, signing, and submission. */
  async planMigration(args: PlanUserRoleMigrationArgs): Promise<UserRoleMigrationPlan> {
    // Distinguish an invalid controller address from a valid controller with no roles.
    await this.program.account.assetAccessController.fetch(args.assetAccessController);
    const roles = await this.all(args.assetAccessController);
    for (const role of roles.filter((role) => role.account.version === 1)) {
      if (!Object.prototype.hasOwnProperty.call(args.gates, role.publicKey.toBase58()))
        throw new Error(`Missing migration gate configuration for ${role.publicKey}`);
    }
    return {
      alreadyMigrated: roles.filter((role) => role.account.version === 2).map((role) => role.publicKey),
      pending: await Promise.all(
        roles
          .filter((role) => role.account.version === 1)
          .map(async (role) => ({
            userRole: role.publicKey,
            instruction: await this.migrateIxn({
              ...args,
              userRole: role.publicKey,
              newGate: args.gates[role.publicKey.toBase58()],
            }),
          }))
      ),
    };
  }
}
