/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/rwa_imr.json`.
 */
export type RwaImr = {
  "address": "D2V7wTBbNCKgYwirgRUnSmc2QyKnHSVmRotWJ4rz8Jp9",
  "metadata": {
    "name": "rwaImr",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addLevels",
      "discriminator": [
        101,
        239,
        15,
        85,
        60,
        13,
        183,
        192
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
          "name": "investor",
          "writable": true
        },
        {
          "name": "identityRegistryProgram",
          "address": "GZsnjqT3c5zbHqsctrJ4EG4rbEfo7ZXyyUG7aDJNmxfA"
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "policyEngineProgram"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "trackerAccount"
        },
        {
          "name": "assetMint"
        }
      ],
      "args": [
        {
          "name": "levels",
          "type": "bytes"
        },
        {
          "name": "expiries",
          "type": {
            "vec": "i64"
          }
        },
        {
          "name": "proofHashes",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "enforceLimits",
          "type": "bool"
        }
      ]
    },
    {
      "name": "attachWalletByInvestor",
      "discriminator": [
        252,
        160,
        12,
        48,
        159,
        73,
        185,
        247
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "wallet",
          "signer": true
        },
        {
          "name": "investor"
        },
        {
          "name": "walletIdentity"
        },
        {
          "name": "identityRegistryProgram",
          "address": "GZsnjqT3c5zbHqsctrJ4EG4rbEfo7ZXyyUG7aDJNmxfA"
        },
        {
          "name": "newWalletIdentity",
          "writable": true
        },
        {
          "name": "identityAccount",
          "writable": true,
          "relations": [
            "investor"
          ]
        },
        {
          "name": "identityRegistry",
          "relations": [
            "investor"
          ]
        },
        {
          "name": "assetMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newWallet",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "changeCountry",
      "discriminator": [
        208,
        227,
        224,
        246,
        9,
        254,
        62,
        179
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
          "name": "investor",
          "writable": true
        },
        {
          "name": "identityRegistryProgram",
          "address": "GZsnjqT3c5zbHqsctrJ4EG4rbEfo7ZXyyUG7aDJNmxfA"
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount",
          "writable": true
        },
        {
          "name": "policyEngineProgram"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "trackerAccount"
        },
        {
          "name": "assetMint"
        }
      ],
      "args": [
        {
          "name": "newCountry",
          "type": "u8"
        },
        {
          "name": "enforceLimits",
          "type": "bool"
        }
      ]
    },
    {
      "name": "registerInvestor",
      "discriminator": [
        95,
        16,
        66,
        212,
        152,
        123,
        136,
        173
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
            "Authority has to be authority or delegate of IdentityRegistry for CPI to succeed."
          ],
          "signer": true
        },
        {
          "name": "investor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "investorId"
              },
              {
                "kind": "account",
                "path": "identityRegistry"
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
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "identityRegistryProgram",
          "address": "GZsnjqT3c5zbHqsctrJ4EG4rbEfo7ZXyyUG7aDJNmxfA"
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount",
          "writable": true
        },
        {
          "name": "walletIdentity",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "investorId",
          "type": "string"
        },
        {
          "name": "collisionHash",
          "type": "string"
        },
        {
          "name": "level",
          "type": "u8"
        },
        {
          "name": "expiry",
          "type": "i64"
        },
        {
          "name": "country",
          "type": "u8"
        },
        {
          "name": "proofHash",
          "type": "string"
        }
      ]
    },
    {
      "name": "removeInvestor",
      "discriminator": [
        93,
        0,
        162,
        199,
        76,
        5,
        180,
        2
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
          "name": "investor",
          "writable": true
        },
        {
          "name": "identityRegistryProgram",
          "address": "GZsnjqT3c5zbHqsctrJ4EG4rbEfo7ZXyyUG7aDJNmxfA"
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount",
          "writable": true
        },
        {
          "name": "walletIdentity",
          "writable": true
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "trackerAccount",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "removeLevels",
      "discriminator": [
        200,
        96,
        65,
        253,
        97,
        55,
        16,
        192
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
          "name": "investor",
          "writable": true
        },
        {
          "name": "identityRegistryProgram",
          "address": "GZsnjqT3c5zbHqsctrJ4EG4rbEfo7ZXyyUG7aDJNmxfA"
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "policyEngineProgram"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "trackerAccount"
        },
        {
          "name": "assetMint"
        }
      ],
      "args": [
        {
          "name": "levelsToRemove",
          "type": "bytes"
        },
        {
          "name": "enforceLimits",
          "type": "bool"
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
      "name": "invalidHash",
      "msg": "Invalid hash"
    },
    {
      "code": 6002,
      "name": "invalidLevels",
      "msg": "Invalid levels"
    },
    {
      "code": 6003,
      "name": "invalidCountryLevel",
      "msg": "Invalid country level"
    },
    {
      "code": 6004,
      "name": "invalidRegionLevel",
      "msg": "Invalid region level"
    },
    {
      "code": 6005,
      "name": "invalidAttribute",
      "msg": "Invalid attribute level"
    },
    {
      "code": 6006,
      "name": "unknownLevel",
      "msg": "Unknown level"
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
            "name": "bump",
            "docs": [
              "PDA Seed Bump"
            ],
            "type": "u8"
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
          },
          {
            "name": "country",
            "type": "u8"
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
    }
  ]
};
