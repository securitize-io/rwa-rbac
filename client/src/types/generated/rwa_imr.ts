/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/rwa_imr.json`.
 */
export type RwaImr = {
  "address": "6eHEqiCNFvZWxZg1dkkSKRABwTcoJ51JYbt692Adu7F9",
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
          "address": "idtynCMYbdisCTv4FrCWPSQboZb1uM4TV2cPi79yxQf"
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
          "name": "identityToInvestor",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "identityAccount"
              },
              {
                "kind": "const",
                "value": [
                  73,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121,
                  84,
                  111,
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
          "address": "idtynCMYbdisCTv4FrCWPSQboZb1uM4TV2cPi79yxQf"
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
          "name": "owner",
          "type": "pubkey"
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
          "writable": true,
          "relations": [
            "identityToInvestor"
          ]
        },
        {
          "name": "identityToInvestor",
          "writable": true
        },
        {
          "name": "identityRegistryProgram",
          "address": "idtynCMYbdisCTv4FrCWPSQboZb1uM4TV2cPi79yxQf"
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "owner",
          "type": "pubkey"
        }
      ]
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
          "address": "idtynCMYbdisCTv4FrCWPSQboZb1uM4TV2cPi79yxQf"
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
        }
      ],
      "args": [
        {
          "name": "levelsToRemove",
          "type": "bytes"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "identityToInvestor",
      "discriminator": [
        120,
        233,
        226,
        235,
        196,
        24,
        74,
        218
      ]
    },
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
    }
  ],
  "types": [
    {
      "name": "identityToInvestor",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "identityAccount",
            "docs": [
              "IdentityAccount associated with this investor."
            ],
            "type": "pubkey"
          },
          {
            "name": "investor",
            "docs": [
              "Investor account associated with this identity."
            ],
            "type": "pubkey"
          }
        ]
      }
    },
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
