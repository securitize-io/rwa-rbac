/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/rwa_rbac.json`.
 */
export type RwaRbac = {
  address: "AzGap3q8fXV1gHPWpAuMFqkpCewvuEY5GrkhCz86ZkDb";
  metadata: {
    name: "rwaRbac";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "addLevelToIdentityAccount";
      discriminator: [102, 204, 64, 169, 252, 177, 192, 232];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "identityRegistryProgram";
          address: "7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ";
        },
        {
          name: "identityRegistry";
        },
        {
          name: "identityAccount";
          writable: true;
        },
        {
          name: "identityAccountOwner";
          docs: [
            "to ensure that it is not an Investor account. If it is an Investor account,",
            "CPI to IdentityMetadataRegistry should be called."
          ];
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "policyEngineProgram";
        },
        {
          name: "policyEngine";
          writable: true;
        },
        {
          name: "trackerAccount";
        },
        {
          name: "assetMint";
        }
      ];
      args: [
        {
          name: "level";
          type: "u8";
        },
        {
          name: "expiry";
          type: "i64";
        },
        {
          name: "enforceLimits";
          type: "bool";
        }
      ];
    },
    {
      name: "addLevels";
      discriminator: [101, 239, 15, 85, 60, 13, 183, 192];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "identityMetadataRegistryProgram";
          address: "6g7C5Re5hMY7Yi4dWGCEXWvzysCEePybo7jgTNBMsuL5";
        },
        {
          name: "investor";
          writable: true;
        },
        {
          name: "identityRegistryProgram";
          address: "7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ";
        },
        {
          name: "identityRegistry";
        },
        {
          name: "identityAccount";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "policyEngineProgram";
        },
        {
          name: "policyEngine";
          writable: true;
        },
        {
          name: "trackerAccount";
        },
        {
          name: "assetMint";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "addTokenLock";
      discriminator: [195, 26, 109, 80, 46, 7, 195, 55];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          writable: true;
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "tokenLocksProgram";
          address: "HKYfwoKujgGHJdHjDAxW8pqqNLmVSe9ukbua8tnQEFPz";
        },
        {
          name: "investorLocks";
          writable: true;
        },
        {
          name: "investor";
        },
        {
          name: "walletIdentityAccount";
        },
        {
          name: "identityAccount";
        },
        {
          name: "assetMint";
          writable: true;
        },
        {
          name: "unlockedTokenAccount";
          writable: true;
        },
        {
          name: "lockedTokenAccount";
          writable: true;
        },
        {
          name: "assetController";
        },
        {
          name: "identityRegistry";
          writable: true;
        },
        {
          name: "assetControllerProgram";
          address: "2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa";
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "assignUserRole";
      discriminator: [39, 8, 31, 232, 255, 118, 39, 44];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "assetAccessController";
          relations: ["userRole", "authorizedUserRole"];
        },
        {
          name: "userRole";
          writable: true;
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "usersToAssign";
          type: {
            vec: "pubkey";
          };
        }
      ];
    },
    {
      name: "attachToPolicyEngine";
      discriminator: [99, 59, 117, 21, 146, 11, 54, 173];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "policyEngineProgram";
          address: "4wyusm2nxncvNyiVej5mZ1k1mVPhfG41oNvHx4BWiYMq";
        },
        {
          name: "policyEngine";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "attachWalletToIdentity";
      discriminator: [61, 129, 252, 190, 8, 202, 179, 90];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "identityRegistryProgram";
          address: "7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ";
        },
        {
          name: "walletIdentity";
          writable: true;
        },
        {
          name: "identityAccount";
          writable: true;
        },
        {
          name: "identityRegistry";
        },
        {
          name: "assetMint";
        },
        {
          name: "newWalletIdentityAccount";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "changeCounterLimits";
      discriminator: [200, 2, 8, 102, 43, 168, 141, 139];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "policyEngineProgram";
          address: "4wyusm2nxncvNyiVej5mZ1k1mVPhfG41oNvHx4BWiYMq";
        },
        {
          name: "policyEngine";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "changeCounters";
      discriminator: [156, 107, 88, 204, 113, 131, 241, 192];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "policyEngineProgram";
          address: "4wyusm2nxncvNyiVej5mZ1k1mVPhfG41oNvHx4BWiYMq";
        },
        {
          name: "policyEngine";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "changeCountry";
      discriminator: [208, 227, 224, 246, 9, 254, 62, 179];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "identityMetadataRegistryProgram";
          address: "6g7C5Re5hMY7Yi4dWGCEXWvzysCEePybo7jgTNBMsuL5";
        },
        {
          name: "investor";
          writable: true;
        },
        {
          name: "identityRegistryProgram";
          address: "7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ";
        },
        {
          name: "identityRegistry";
        },
        {
          name: "identityAccount";
          writable: true;
        },
        {
          name: "policyEngineProgram";
        },
        {
          name: "policyEngine";
          writable: true;
        },
        {
          name: "trackerAccount";
        },
        {
          name: "assetMint";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "changeIssuancePolicies";
      discriminator: [186, 201, 163, 157, 32, 250, 166, 37];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "policyEngineProgram";
          address: "4wyusm2nxncvNyiVej5mZ1k1mVPhfG41oNvHx4BWiYMq";
        },
        {
          name: "policyEngine";
          writable: true;
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "changeMapping";
      discriminator: [103, 1, 52, 20, 160, 194, 113, 125];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "policyEngineProgram";
          address: "4wyusm2nxncvNyiVej5mZ1k1mVPhfG41oNvHx4BWiYMq";
        },
        {
          name: "policyEngine";
          writable: true;
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "closeInvestorLocks";
      discriminator: [255, 60, 220, 115, 217, 104, 157, 171];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "tokenLocksProgram";
          address: "HKYfwoKujgGHJdHjDAxW8pqqNLmVSe9ukbua8tnQEFPz";
        },
        {
          name: "investorLocks";
          writable: true;
        },
        {
          name: "investor";
        },
        {
          name: "lockedTokenAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "closeMintAccount";
      discriminator: [14, 121, 72, 246, 96, 224, 42, 162];
      accounts: [
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          writable: true;
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "assetControllerProgram";
          address: "2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa";
        },
        {
          name: "assetMint";
          writable: true;
        },
        {
          name: "assetController";
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "createController";
      discriminator: [176, 246, 168, 148, 10, 12, 2, 48];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "admin";
          signer: true;
        },
        {
          name: "assetAccessController";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "uniqueSeed";
              },
              {
                kind: "const";
                value: [
                  65,
                  115,
                  115,
                  101,
                  116,
                  65,
                  99,
                  99,
                  101,
                  115,
                  115,
                  67,
                  111,
                  110,
                  116,
                  114,
                  111,
                  108,
                  108,
                  101,
                  114
                ];
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "uniqueSeed";
          type: "pubkey";
        }
      ];
    },
    {
      name: "createIdentityAccount";
      discriminator: [82, 240, 35, 129, 113, 134, 116, 70];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "identityRegistryProgram";
          address: "7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ";
        },
        {
          name: "identityRegistry";
        },
        {
          name: "identityAccount";
          writable: true;
        },
        {
          name: "walletIdentity";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "createInvestorLocks";
      discriminator: [223, 81, 139, 162, 204, 48, 24, 213];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "tokenLocksProgram";
          address: "HKYfwoKujgGHJdHjDAxW8pqqNLmVSe9ukbua8tnQEFPz";
        },
        {
          name: "investorLocks";
          writable: true;
        },
        {
          name: "investor";
        },
        {
          name: "identityAccount";
        },
        {
          name: "assetMint";
          writable: true;
        },
        {
          name: "lockedTokenAccount";
          writable: true;
        },
        {
          name: "assetController";
        },
        {
          name: "assetControllerProgram";
          address: "2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa";
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "createUserRole";
      discriminator: [13, 20, 224, 42, 3, 120, 67, 23];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "newUserRole";
          writable: true;
        },
        {
          name: "assetAccessController";
          writable: true;
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "name";
          type: "string";
        },
        {
          name: "allowedAdminIxs";
          type: "u64";
        },
        {
          name: "allowedMediciIxs";
          type: "u64";
        }
      ];
    },
    {
      name: "deleteUserRole";
      discriminator: [177, 139, 27, 46, 113, 250, 139, 225];
      accounts: [
        {
          name: "receiver";
          writable: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "assetAccessController";
          relations: ["userRole", "authorizedUserRole"];
        },
        {
          name: "userRole";
          writable: true;
        },
        {
          name: "authorizedUserRole";
          optional: true;
        }
      ];
      args: [];
    },
    {
      name: "detachFromPolicyEngine";
      discriminator: [156, 137, 67, 121, 46, 207, 45, 12];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "policyEngineProgram";
          address: "4wyusm2nxncvNyiVej5mZ1k1mVPhfG41oNvHx4BWiYMq";
        },
        {
          name: "policyEngine";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "detachWalletFromIdentity";
      discriminator: [166, 70, 236, 254, 166, 116, 201, 50];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          writable: true;
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "identityRegistryProgram";
          address: "7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ";
        },
        {
          name: "walletIdentity";
          writable: true;
        },
        {
          name: "identityAccount";
          writable: true;
        },
        {
          name: "identityRegistry";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "freezeTokenAccount";
      discriminator: [138, 168, 178, 109, 205, 224, 209, 93];
      accounts: [
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "assetControllerProgram";
          address: "2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa";
        },
        {
          name: "assetMint";
          writable: true;
        },
        {
          name: "assetController";
        },
        {
          name: "tokenAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "issueTokens";
      discriminator: [40, 207, 145, 106, 249, 54, 23, 179];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          writable: true;
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "assetControllerProgram";
          address: "2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa";
        },
        {
          name: "assetMint";
          writable: true;
        },
        {
          name: "assetController";
        },
        {
          name: "to";
        },
        {
          name: "tokenAccount";
          writable: true;
        },
        {
          name: "identityRegistry";
          writable: true;
        },
        {
          name: "identityAccount";
        },
        {
          name: "trackerAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "policyEngineProgram";
          address: "4wyusm2nxncvNyiVej5mZ1k1mVPhfG41oNvHx4BWiYMq";
        },
        {
          name: "policyEngine";
          writable: true;
        },
        {
          name: "walletIdentityAccount";
        },
        {
          name: "tokenLocksProgram";
          optional: true;
          address: "HKYfwoKujgGHJdHjDAxW8pqqNLmVSe9ukbua8tnQEFPz";
        },
        {
          name: "investorLocks";
          writable: true;
          optional: true;
        },
        {
          name: "investor";
          optional: true;
        },
        {
          name: "lockedTokenAccount";
          writable: true;
          optional: true;
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        },
        {
          name: "issuanceTimestamp";
          type: "i64";
        },
        {
          name: "reasonCode";
          type: {
            option: "u64";
          };
        },
        {
          name: "reasonString";
          type: {
            option: "string";
          };
        }
      ];
    },
    {
      name: "modifyUserRole";
      discriminator: [108, 235, 68, 252, 229, 247, 71, 185];
      accounts: [
        {
          name: "user";
          signer: true;
        },
        {
          name: "assetAccessController";
          relations: ["userRole", "authorizedUserRole"];
        },
        {
          name: "userRole";
          writable: true;
        },
        {
          name: "authorizedUserRole";
          optional: true;
        }
      ];
      args: [
        {
          name: "name";
          type: "string";
        },
        {
          name: "allowedAdminIxs";
          type: "u64";
        },
        {
          name: "allowedMediciIxs";
          type: "u64";
        }
      ];
    },
    {
      name: "refreshLevelToIdentityAccount";
      discriminator: [23, 68, 237, 111, 144, 169, 239, 91];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "identityRegistryProgram";
          address: "7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ";
        },
        {
          name: "identityRegistry";
        },
        {
          name: "identityAccount";
          writable: true;
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "registerInvestor";
      discriminator: [95, 16, 66, 212, 152, 123, 136, 173];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "identityMetadataRegistryProgram";
          address: "6g7C5Re5hMY7Yi4dWGCEXWvzysCEePybo7jgTNBMsuL5";
        },
        {
          name: "investor";
          writable: true;
        },
        {
          name: "identityRegistryProgram";
          address: "7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ";
        },
        {
          name: "identityRegistry";
        },
        {
          name: "identityAccount";
          writable: true;
        },
        {
          name: "walletIdentity";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "removeInvestor";
      discriminator: [93, 0, 162, 199, 76, 5, 180, 2];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "identityMetadataRegistryProgram";
          address: "6g7C5Re5hMY7Yi4dWGCEXWvzysCEePybo7jgTNBMsuL5";
        },
        {
          name: "investor";
          writable: true;
        },
        {
          name: "identityRegistryProgram";
          address: "7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ";
        },
        {
          name: "identityRegistry";
        },
        {
          name: "identityAccount";
          writable: true;
        }
      ];
      args: [];
    },
    {
      name: "removeLevelFromIdentityAccount";
      discriminator: [194, 231, 187, 54, 197, 136, 170, 55];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "identityRegistryProgram";
          address: "7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ";
        },
        {
          name: "identityRegistry";
        },
        {
          name: "identityAccount";
          writable: true;
        },
        {
          name: "identityAccountOwner";
          docs: [
            "to ensure that it is not an Investor account. If it is an Investor account,",
            "CPI to IdentityMetadataRegistry should be called."
          ];
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "policyEngineProgram";
        },
        {
          name: "policyEngine";
          writable: true;
        },
        {
          name: "trackerAccount";
        },
        {
          name: "assetMint";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "removeLevels";
      discriminator: [200, 96, 65, 253, 97, 55, 16, 192];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "identityMetadataRegistryProgram";
          address: "6g7C5Re5hMY7Yi4dWGCEXWvzysCEePybo7jgTNBMsuL5";
        },
        {
          name: "investor";
          writable: true;
        },
        {
          name: "identityRegistryProgram";
          address: "7Zis9Cg1pa3PMRCMfJBgzoQThoBA21QMrkmEnx6nZdQQ";
        },
        {
          name: "identityRegistry";
        },
        {
          name: "identityAccount";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "policyEngineProgram";
        },
        {
          name: "policyEngine";
          writable: true;
        },
        {
          name: "trackerAccount";
        },
        {
          name: "assetMint";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "removeTokenLock";
      discriminator: [168, 128, 173, 188, 172, 228, 154, 90];
      accounts: [
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          writable: true;
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "tokenLocksProgram";
          address: "HKYfwoKujgGHJdHjDAxW8pqqNLmVSe9ukbua8tnQEFPz";
        },
        {
          name: "investorLocks";
          writable: true;
        },
        {
          name: "investor";
        },
        {
          name: "walletIdentityAccount";
        },
        {
          name: "identityAccount";
        },
        {
          name: "assetMint";
          writable: true;
        },
        {
          name: "unlockedTokenAccount";
          writable: true;
        },
        {
          name: "lockedTokenAccount";
          writable: true;
        },
        {
          name: "assetController";
        },
        {
          name: "identityRegistry";
          writable: true;
        },
        {
          name: "assetControllerProgram";
          address: "2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa";
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }
      ];
      args: [
        {
          name: "indices";
          type: "bytes";
        }
      ];
    },
    {
      name: "removeUserRole";
      discriminator: [43, 242, 133, 94, 48, 124, 214, 153];
      accounts: [
        {
          name: "user";
          signer: true;
        },
        {
          name: "assetAccessController";
          relations: ["userRole", "authorizedUserRole"];
        },
        {
          name: "userRole";
          writable: true;
        },
        {
          name: "authorizedUserRole";
          optional: true;
        }
      ];
      args: [
        {
          name: "usersToRemove";
          type: {
            vec: "pubkey";
          };
        }
      ];
    },
    {
      name: "revokeTokens";
      discriminator: [215, 42, 15, 134, 173, 80, 33, 21];
      accounts: [
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          writable: true;
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "assetControllerProgram";
          address: "2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa";
        },
        {
          name: "assetMint";
          writable: true;
        },
        {
          name: "assetController";
        },
        {
          name: "revokeTokenAccount";
          writable: true;
        },
        {
          name: "identityRegistry";
        },
        {
          name: "identityAccount";
        },
        {
          name: "trackerAccount";
          writable: true;
        },
        {
          name: "policyEngineProgram";
        },
        {
          name: "policyEngine";
          writable: true;
        },
        {
          name: "walletIdentityAccount";
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "seizeTokens";
      discriminator: [79, 30, 69, 54, 78, 1, 16, 23];
      accounts: [
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          writable: true;
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "assetControllerProgram";
          address: "2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa";
        },
        {
          name: "assetMint";
        },
        {
          name: "assetController";
        },
        {
          name: "destinationTokenAccount";
          writable: true;
        },
        {
          name: "sourceTokenAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "setCounters";
      discriminator: [127, 151, 147, 141, 171, 53, 28, 135];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "policyEngineProgram";
          address: "4wyusm2nxncvNyiVej5mZ1k1mVPhfG41oNvHx4BWiYMq";
        },
        {
          name: "policyEngine";
          writable: true;
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "thawTokenAccount";
      discriminator: [199, 172, 96, 93, 244, 252, 137, 171];
      accounts: [
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "assetControllerProgram";
          address: "2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa";
        },
        {
          name: "assetMint";
          writable: true;
        },
        {
          name: "assetController";
        },
        {
          name: "identityRegistryAccount";
          writable: true;
        },
        {
          name: "tokenAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "updateAssetMetadata";
      discriminator: [217, 98, 205, 153, 242, 4, 41, 76];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          writable: true;
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "assetControllerProgram";
          address: "2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa";
        },
        {
          name: "assetMint";
          writable: true;
        },
        {
          name: "assetController";
        },
        {
          name: "eventAuthority";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "updateControllerAdmin";
      discriminator: [94, 188, 33, 18, 191, 119, 128, 209];
      accounts: [
        {
          name: "admin";
          signer: true;
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          writable: true;
        }
      ];
      args: [
        {
          name: "newAdmin";
          type: "pubkey";
        }
      ];
    },
    {
      name: "updateInterestBearingMintRate";
      discriminator: [29, 174, 109, 163, 227, 75, 2, 144];
      accounts: [
        {
          name: "user";
          signer: true;
        },
        {
          name: "controllerAuthority";
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
          relations: ["authorizedUserRole"];
        },
        {
          name: "authorizedUserRole";
          optional: true;
        },
        {
          name: "assetControllerProgram";
          address: "2fJZj6eLMvdGkHTePvbXGjh9x1hHSMvkBPhTcAAPvBMa";
        },
        {
          name: "assetMint";
          writable: true;
        },
        {
          name: "assetController";
        },
        {
          name: "eventAuthority";
        },
        {
          name: "tokenProgram";
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
        }
      ];
      args: [
        {
          name: "cpiData";
          type: "bytes";
        }
      ];
    },
    {
      name: "withdrawExcessRent";
      discriminator: [20, 25, 71, 58, 107, 60, 159, 75];
      accounts: [
        {
          name: "receiver";
          writable: true;
        },
        {
          name: "admin";
          signer: true;
          relations: ["assetAccessController"];
        },
        {
          name: "controllerAuthority";
          writable: true;
          relations: ["assetAccessController"];
        },
        {
          name: "assetAccessController";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "assetAccessController";
      discriminator: [159, 84, 3, 26, 90, 167, 134, 33];
    },
    {
      name: "userRole";
      discriminator: [62, 252, 194, 137, 183, 165, 147, 28];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "unknownInstruction";
      msg: "Unknown program instruction from CPI data";
    },
    {
      code: 6001;
      name: "invalidName";
      msg: "Invalid name";
    },
    {
      code: 6002;
      name: "invalidUserRole";
      msg: "Invalid user role";
    },
    {
      code: 6003;
      name: "dataIsNotEmpty";
      msg: "Data is not empty";
    },
    {
      code: 6004;
      name: "unknownAccount";
      msg: "Unknown account discriminator";
    },
    {
      code: 6005;
      name: "missingReason";
      msg: "Missing reason or code";
    },
    {
      code: 6006;
      name: "invalidLevel";
      msg: "Invalid level";
    }
  ];
  types: [
    {
      name: "assetAccessController";
      type: {
        kind: "struct";
        fields: [
          {
            name: "controllerAuthority";
            docs: [
              "PDA generated from [asset_access_controller] as seed to be used as signer authority."
            ];
            type: "pubkey";
          },
          {
            name: "controllerAuthorityBump";
            docs: ["Bump seed for controller_authority."];
            type: "u8";
          },
          {
            name: "admin";
            docs: ["Admin keypair that's allowed to manage this controller."];
            type: "pubkey";
          },
          {
            name: "uniqueSeed";
            docs: ["Unique seed used for creating this account."];
            type: "pubkey";
          },
          {
            name: "userRolesCount";
            docs: [
              "Number of UserRoles created since initialization. Used for deriving all created UserRole PDAs."
            ];
            type: "u64";
          }
        ];
      };
    },
    {
      name: "userRole";
      type: {
        kind: "struct";
        fields: [
          {
            name: "assetAccessController";
            docs: ["Controller that user role is designated for."];
            type: "pubkey";
          },
          {
            name: "id";
            docs: [
              "ID of UserRole. Matches AssetAccessController.user_roles_count at time of creation."
            ];
            type: "u64";
          },
          {
            name: "name";
            docs: ["Name of this role."];
            type: "string";
          },
          {
            name: "allowedAdminIxs";
            docs: ["Bitflag of allowed admin instructions."];
            type: "u64";
          },
          {
            name: "allowedMediciIxs";
            docs: ["Bitflag of allowed Medici CPI instructions."];
            type: "u64";
          },
          {
            name: "users";
            docs: ["List of users assigned with this role."];
            type: {
              vec: "pubkey";
            };
          }
        ];
      };
    }
  ];
};
