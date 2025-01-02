/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/token_locks.json`.
 */
export type TokenLocks = {
  address: "HKYfwoKujgGHJdHjDAxW8pqqNLmVSe9ukbua8tnQEFPz";
  metadata: {
    name: "tokenLocks";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
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
          name: "authority";
          docs: [
            "Authority of AssetController (required to execute seize CPI)."
          ];
          writable: true;
          signer: true;
          relations: ["investor"];
        },
        {
          name: "investorLocks";
          writable: true;
        },
        {
          name: "investor";
          relations: ["investorLocks"];
        },
        {
          name: "walletIdentityAccount";
        },
        {
          name: "identityAccount";
          docs: ["CHECKED: Validated in deserialized_checked."];
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
          relations: ["investorLocks"];
        },
        {
          name: "assetController";
        },
        {
          name: "identityRegistry";
          writable: true;
          relations: ["investor"];
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
          name: "value";
          type: "u64";
        },
        {
          name: "releaseTime";
          type: "i64";
        },
        {
          name: "reasonCode";
          type: "u64";
        },
        {
          name: "reasonString";
          type: "string";
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
          name: "authority";
          signer: true;
          relations: ["investor"];
        },
        {
          name: "investorLocks";
          writable: true;
        },
        {
          name: "investor";
          relations: ["investorLocks"];
        },
        {
          name: "lockedTokenAccount";
          writable: true;
          relations: ["investorLocks"];
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
      name: "createInvestorLocks";
      discriminator: [223, 81, 139, 162, 204, 48, 24, 213];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "authority";
          signer: true;
          relations: ["investor"];
        },
        {
          name: "wallet";
        },
        {
          name: "investorLocks";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "investor.investor_id";
                account: "investor";
              },
              {
                kind: "account";
                path: "investor.identity_registry";
                account: "investor";
              },
              {
                kind: "const";
                value: [
                  73,
                  110,
                  118,
                  101,
                  115,
                  116,
                  111,
                  114,
                  76,
                  111,
                  99,
                  107,
                  115
                ];
              }
            ];
          };
        },
        {
          name: "investor";
        },
        {
          name: "identityAccount";
          docs: ["CHECKED: Validated in deserialized_checked."];
          pda: {
            seeds: [
              {
                kind: "account";
                path: "investor.identity_registry";
                account: "investor";
              },
              {
                kind: "account";
                path: "wallet";
              }
            ];
            program: {
              kind: "const";
              value: [
                97,
                136,
                11,
                54,
                78,
                78,
                37,
                158,
                149,
                188,
                152,
                96,
                175,
                193,
                164,
                230,
                246,
                55,
                15,
                7,
                183,
                58,
                98,
                183,
                95,
                31,
                35,
                14,
                69,
                164,
                68,
                141
              ];
            };
          };
          relations: ["investor"];
        },
        {
          name: "assetMint";
          writable: true;
        },
        {
          name: "lockedTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "investor.investor_id";
                account: "investor";
              },
              {
                kind: "account";
                path: "investor.identity_registry";
                account: "investor";
              },
              {
                kind: "const";
                value: [
                  76,
                  111,
                  99,
                  107,
                  101,
                  100,
                  84,
                  111,
                  107,
                  101,
                  110,
                  65,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ];
              }
            ];
          };
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
      name: "removeTokenLock";
      discriminator: [168, 128, 173, 188, 172, 228, 154, 90];
      accounts: [
        {
          name: "user";
          signer: true;
        },
        {
          name: "authority";
          docs: [
            "Authority of AssetController (required to execute seize CPI)."
          ];
          writable: true;
          signer: true;
          relations: ["investor"];
        },
        {
          name: "investorLocks";
          writable: true;
        },
        {
          name: "investor";
          relations: ["investorLocks"];
        },
        {
          name: "walletIdentityAccount";
        },
        {
          name: "identityAccount";
          docs: ["CHECKED: Validated in deserialized_checked."];
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
          relations: ["investorLocks"];
        },
        {
          name: "assetController";
        },
        {
          name: "identityRegistry";
          writable: true;
          relations: ["investor"];
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
          name: "isUserAuthorized";
          type: "bool";
        },
        {
          name: "index";
          type: "u64";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "investor";
      discriminator: [174, 129, 17, 83, 36, 116, 26, 196];
    },
    {
      name: "investorLocks";
      discriminator: [199, 60, 219, 46, 221, 205, 1, 7];
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
      name: "unknownAccount";
      msg: "Unknown account discriminator";
    },
    {
      code: 6002;
      name: "failedDeserialization";
      msg: "Invalid account on deserialization";
    },
    {
      code: 6003;
      name: "invalidReleaseTime";
      msg: "Invalid release time";
    },
    {
      code: 6004;
      name: "invalidReasonString";
      msg: "Invalid reason string";
    },
    {
      code: 6005;
      name: "invalidLockValue";
      msg: "Invalid lock value";
    },
    {
      code: 6006;
      name: "unauthorizedUser";
      msg: "User initiating instruction is not authorized by RBAC";
    },
    {
      code: 6007;
      name: "invalidTokenAccountState";
      msg: "Invalid token account state";
    }
  ];
  types: [
    {
      name: "investor";
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            docs: [
              "Authority keypair allowed to write this account, will match authority or delegate of IdentityRegistry",
              "at time of creation of IdentityAccount."
            ];
            type: "pubkey";
          },
          {
            name: "identityAccount";
            docs: ["IdentityAccount associated with this investor."];
            type: "pubkey";
          },
          {
            name: "identityRegistry";
            docs: ["IdentityRegistryAccount associated with this investor."];
            type: "pubkey";
          },
          {
            name: "investorId";
            docs: ["Unique ID for Investor, generated off-chain."];
            type: "string";
          },
          {
            name: "collisionHash";
            docs: ["Metadata for investor, generated off-chain."];
            type: "string";
          },
          {
            name: "lastUpdatedBy";
            docs: [
              "User that last modified this investor. Read from payer of instruction."
            ];
            type: "pubkey";
          },
          {
            name: "levels";
            docs: ["Levels assigned to investor."];
            type: {
              vec: {
                defined: {
                  name: "levelData";
                };
              };
            };
          },
          {
            name: "country";
            type: "u8";
          }
        ];
      };
    },
    {
      name: "investorLocks";
      type: {
        kind: "struct";
        fields: [
          {
            name: "investor";
            docs: ["Address of Investor account."];
            type: "pubkey";
          },
          {
            name: "wallet";
            docs: [
              "Wallet holding the locked tokens (matches Investor's owner)."
            ];
            type: "pubkey";
          },
          {
            name: "lockedTokenAccount";
            docs: [
              "Account storing locked tokens for wallet. Will be frozen upon initialization of",
              "InvestorLocks."
            ];
            type: "pubkey";
          },
          {
            name: "locks";
            type: {
              vec: {
                defined: {
                  name: "lock";
                };
              };
            };
          }
        ];
      };
    },
    {
      name: "levelData";
      type: {
        kind: "struct";
        fields: [
          {
            name: "level";
            docs: ["Maps to IdentityAccount level used in RWA Token."];
            type: "u8";
          },
          {
            name: "proofHash";
            docs: ["Hash generated off-chain."];
            type: "string";
          }
        ];
      };
    },
    {
      name: "lock";
      type: {
        kind: "struct";
        fields: [
          {
            name: "value";
            docs: ["Amount of tokens to lock."];
            type: "u64";
          },
          {
            name: "releaseTime";
            docs: [
              "Timestamp from which the lock will be inactive. If value is 0, the lock",
              "will remain active until removed."
            ];
            type: "i64";
          },
          {
            name: "reasonCode";
            docs: ["Reason code for locking."];
            type: "u64";
          },
          {
            name: "reasonString";
            docs: [
              "Detailed reason for the lock. Since string has no length limit, we calculate",
              "total space needed dynamically at time of resizing."
            ];
            type: "string";
          }
        ];
      };
    }
  ];
};
