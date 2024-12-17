/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/token_locks.json`.
 */
export type TokenLocks = {
  "address": "DKexLhcELG3mdqZXdgFsnP5h411VQCqEUvTSqahhsGL5",
  "metadata": {
    "name": "tokenLocks",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addTokenLock",
      "discriminator": [
        195,
        26,
        109,
        80,
        46,
        7,
        195,
        55
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "docs": [
            "Authority of AssetController (required to execute seize CPI)."
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "investor"
          ]
        },
        {
          "name": "investorLocks",
          "writable": true
        },
        {
          "name": "investor",
          "relations": [
            "investorLocks"
          ]
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "unlockedTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investor_locks.wallet",
                "account": "investorLocks"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "lockedTokenAccount",
          "writable": true,
          "relations": [
            "investorLocks"
          ]
        },
        {
          "name": "assetController"
        },
        {
          "name": "identityRegistry",
          "writable": true,
          "relations": [
            "investor"
          ]
        },
        {
          "name": "assetControllerProgram",
          "address": "acpcFrzEYKjVLvZGWueTV8vyDjhu3oKC7sN38QELLan"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "value",
          "type": "u64"
        },
        {
          "name": "releaseTime",
          "type": "i64"
        },
        {
          "name": "reasonCode",
          "type": "u64"
        },
        {
          "name": "reasonString",
          "type": "string"
        }
      ]
    },
    {
      "name": "closeInvestorLocks",
      "discriminator": [
        255,
        60,
        220,
        115,
        217,
        104,
        157,
        171
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "investor"
          ]
        },
        {
          "name": "investorLocks",
          "writable": true
        },
        {
          "name": "investor",
          "relations": [
            "investorLocks"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createInvestorLocks",
      "discriminator": [
        223,
        81,
        139,
        162,
        204,
        48,
        24,
        213
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "investor"
          ]
        },
        {
          "name": "investorLocks",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investor.investor_id",
                "account": "investor"
              },
              {
                "kind": "account",
                "path": "investor.identity_registry",
                "account": "investor"
              },
              {
                "kind": "arg",
                "path": "wallet"
              },
              {
                "kind": "const",
                "value": [
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
                ]
              }
            ]
          }
        },
        {
          "name": "investor"
        },
        {
          "name": "identityAccount",
          "docs": [
            "CHECKED: Validated in deserialized_checked."
          ]
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "lockedTokenAccount",
          "writable": true
        },
        {
          "name": "assetController"
        },
        {
          "name": "assetControllerProgram",
          "address": "acpcFrzEYKjVLvZGWueTV8vyDjhu3oKC7sN38QELLan"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "walletIdentity",
          "docs": [
            "Optionally lock a specific wallet attached to an Investor, instead of the owner.",
            "CHECKED: Validated to match identity_account and wallet."
          ],
          "optional": true
        }
      ],
      "args": [
        {
          "name": "wallet",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "removeTokenLock",
      "discriminator": [
        168,
        128,
        173,
        188,
        172,
        228,
        154,
        90
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority of AssetController (required to execute seize CPI)."
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "investor"
          ]
        },
        {
          "name": "investorLocks",
          "writable": true
        },
        {
          "name": "investor",
          "relations": [
            "investorLocks"
          ]
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "unlockedTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investor_locks.wallet",
                "account": "investorLocks"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "lockedTokenAccount",
          "writable": true,
          "relations": [
            "investorLocks"
          ]
        },
        {
          "name": "assetController"
        },
        {
          "name": "identityRegistry",
          "writable": true,
          "relations": [
            "investor"
          ]
        },
        {
          "name": "assetControllerProgram",
          "address": "acpcFrzEYKjVLvZGWueTV8vyDjhu3oKC7sN38QELLan"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "isUserAuthorized",
          "type": "bool"
        },
        {
          "name": "index",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "investor",
      "discriminator": [
        174,
        129,
        17,
        83,
        36,
        116,
        26,
        196
      ]
    },
    {
      "name": "investorLocks",
      "discriminator": [
        199,
        60,
        219,
        46,
        221,
        205,
        1,
        7
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unknownInstruction",
      "msg": "Unknown program instruction from CPI data"
    },
    {
      "code": 6001,
      "name": "unknownAccount",
      "msg": "Unknown account discriminator"
    },
    {
      "code": 6002,
      "name": "failedDeserialization",
      "msg": "Invalid account on deserialization"
    },
    {
      "code": 6003,
      "name": "invalidReleaseTime",
      "msg": "Invalid release time"
    },
    {
      "code": 6004,
      "name": "invalidReasonString",
      "msg": "Invalid reason string"
    },
    {
      "code": 6005,
      "name": "invalidLockValue",
      "msg": "Invalid lock value"
    },
    {
      "code": 6006,
      "name": "unauthorizedUser",
      "msg": "User initiating instruction is not authorized by RBAC"
    },
    {
      "code": 6007,
      "name": "invalidTokenAccountState",
      "msg": "Invalid token account state"
    }
  ],
  "types": [
    {
      "name": "investor",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Authority keypair allowed to write this account, will match authority or delegate of IdentityRegistry",
              "at time of creation of IdentityAccount."
            ],
            "type": "pubkey"
          },
          {
            "name": "identityAccount",
            "docs": [
              "IdentityAccount associated with this investor."
            ],
            "type": "pubkey"
          },
          {
            "name": "identityRegistry",
            "docs": [
              "IdentityRegistryAccount associated with this investor."
            ],
            "type": "pubkey"
          },
          {
            "name": "investorId",
            "docs": [
              "Unique ID for Investor, generated off-chain."
            ],
            "type": "string"
          },
          {
            "name": "collisionHash",
            "docs": [
              "Metadata for investor, generated off-chain."
            ],
            "type": "string"
          },
          {
            "name": "lastUpdatedBy",
            "docs": [
              "User that last modified this investor. Read from payer of instruction."
            ],
            "type": "pubkey"
          },
          {
            "name": "levels",
            "docs": [
              "Levels assigned to investor."
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "levelData"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "investorLocks",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "investor",
            "docs": [
              "Addresss of Investor account."
            ],
            "type": "pubkey"
          },
          {
            "name": "wallet",
            "docs": [
              "Wallet (owned by the Investor) that is locked."
            ],
            "type": "pubkey"
          },
          {
            "name": "lockedTokenAccount",
            "docs": [
              "Account storing locked tokens for wallet. Will be frozen upon initialization of",
              "investor locks."
            ],
            "type": "pubkey"
          },
          {
            "name": "locks",
            "type": {
              "vec": {
                "defined": {
                  "name": "lock"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "levelData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "level",
            "docs": [
              "Maps to IdentityAccount level used in RWA Token."
            ],
            "type": "u8"
          },
          {
            "name": "proofHash",
            "docs": [
              "Hash generated off-chain."
            ],
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "lock",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "docs": [
              "Amount of tokens to lock."
            ],
            "type": "u64"
          },
          {
            "name": "releaseTime",
            "docs": [
              "Timestamp from which the lock will be inactive. If value is 0, the lock",
              "will remain active until removed."
            ],
            "type": "i64"
          },
          {
            "name": "reasonCode",
            "docs": [
              "Reason code for locking."
            ],
            "type": "u64"
          },
          {
            "name": "reasonString",
            "docs": [
              "Detailed reason for the lock. Since string has no length limit, we calculate",
              "total space needed dynamically at time of resizing."
            ],
            "type": "string"
          }
        ]
      }
    }
  ]
};
