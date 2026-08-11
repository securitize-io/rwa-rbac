/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/rwa_rbac.json`.
 */
export type RwaRbac = {
  "address": "3g6fUgMsJQhjPUYxNjEU5PyzGf8DerbDx8p5Qh4yMnRR",
  "metadata": {
    "name": "rwaRbac",
    "version": "1.1.0",
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
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "identityMetadataRegistryProgram",
          "address": "D2V7wTBbNCKgYwirgRUnSmc2QyKnHSVmRotWJ4rz8Jp9"
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
        },
        {
          "name": "eventAuthorityIdentityMetadataRegistry"
        },
        {
          "name": "eventAuthorityIdentityRegistry"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "addLock",
      "discriminator": [
        242,
        102,
        183,
        107,
        109,
        168,
        82,
        140
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount"
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "assignUserRole",
      "discriminator": [
        39,
        8,
        31,
        232,
        255,
        118,
        39,
        44
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "assetAccessController",
          "writable": true,
          "relations": [
            "userRole",
            "authorizedUserRole"
          ]
        },
        {
          "name": "userRole",
          "writable": true
        },
        {
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "usersToAssign",
          "type": {
            "vec": "pubkey"
          }
        }
      ]
    },
    {
      "name": "attachToPolicyEngine",
      "discriminator": [
        99,
        59,
        117,
        21,
        146,
        11,
        54,
        173
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "attachWalletToIdentity",
      "discriminator": [
        61,
        129,
        252,
        190,
        8,
        202,
        179,
        90
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "identityRegistryProgram",
          "address": "GZsnjqT3c5zbHqsctrJ4EG4rbEfo7ZXyyUG7aDJNmxfA"
        },
        {
          "name": "walletIdentity",
          "writable": true
        },
        {
          "name": "identityAccount",
          "writable": true
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "assetMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "changeCounterLimits",
      "discriminator": [
        200,
        2,
        8,
        102,
        43,
        168,
        141,
        139
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "changeCounters",
      "discriminator": [
        156,
        107,
        88,
        204,
        113,
        131,
        241,
        192
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
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
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "identityMetadataRegistryProgram",
          "address": "D2V7wTBbNCKgYwirgRUnSmc2QyKnHSVmRotWJ4rz8Jp9"
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
        },
        {
          "name": "eventAuthorityIdentityRegistry"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "changeIssuancePolicies",
      "discriminator": [
        186,
        201,
        163,
        157,
        32,
        250,
        166,
        37
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "changeMapping",
      "discriminator": [
        103,
        1,
        52,
        20,
        160,
        194,
        113,
        125
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "createController",
      "discriminator": [
        176,
        246,
        168,
        148,
        10,
        12,
        2,
        48
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "assetAccessController",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              },
              {
                "kind": "const",
                "value": [
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
                ]
              }
            ]
          }
        },
        {
          "name": "assetAccessControllerAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetAccessController"
              }
            ]
          }
        },
        {
          "name": "assetController",
          "writable": true
        },
        {
          "name": "assetMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "extraMetasAccount",
          "writable": true
        },
        {
          "name": "policyEngineAccount",
          "writable": true
        },
        {
          "name": "identityRegistryAccount",
          "writable": true
        },
        {
          "name": "policyEngineProgram"
        },
        {
          "name": "identityRegistryProgram"
        },
        {
          "name": "assetControllerProgram"
        },
        {
          "name": "assetControllerEventAuthority"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "createIdentityAccount",
      "discriminator": [
        82,
        240,
        35,
        129,
        113,
        134,
        116,
        70
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
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
          "name": "policyEngineProgram"
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "createUserRole",
      "discriminator": [
        13,
        20,
        224,
        42,
        3,
        120,
        67,
        23
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "newUserRole",
          "writable": true
        },
        {
          "name": "assetAccessController",
          "writable": true,
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "allowedAdminIxs",
          "type": "u64"
        },
        {
          "name": "allowedMediciIxs",
          "type": "u64"
        },
        {
          "name": "isMasterRole",
          "type": "bool"
        },
        {
          "name": "multisigAuthority",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "deleteUserRole",
      "discriminator": [
        177,
        139,
        27,
        46,
        113,
        250,
        139,
        225
      ],
      "accounts": [
        {
          "name": "receiver",
          "writable": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "assetAccessController",
          "relations": [
            "userRole",
            "authorizedUserRole"
          ]
        },
        {
          "name": "userRole",
          "writable": true
        },
        {
          "name": "authorizedUserRole",
          "optional": true
        }
      ],
      "args": []
    },
    {
      "name": "detachFromPolicyEngine",
      "discriminator": [
        156,
        137,
        67,
        121,
        46,
        207,
        45,
        12
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "detachWalletFromIdentity",
      "discriminator": [
        166,
        70,
        236,
        254,
        166,
        116,
        201,
        50
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "writable": true,
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "identityRegistryProgram",
          "address": "GZsnjqT3c5zbHqsctrJ4EG4rbEfo7ZXyyUG7aDJNmxfA"
        },
        {
          "name": "walletIdentity",
          "writable": true
        },
        {
          "name": "identityAccount",
          "writable": true
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "tokenAccount"
        },
        {
          "name": "assetMint"
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "freezeTokenAccount",
      "discriminator": [
        138,
        168,
        178,
        109,
        205,
        224,
        209,
        93
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "assetControllerProgram",
          "address": "7tXjmbkZVY3Gmg9kDBebcNXT1yC5pyoxxXVLwdbv9tvP"
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "assetController"
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "issueTokens",
      "discriminator": [
        40,
        207,
        145,
        106,
        249,
        54,
        23,
        179
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "writable": true,
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "assetControllerProgram",
          "address": "7tXjmbkZVY3Gmg9kDBebcNXT1yC5pyoxxXVLwdbv9tvP"
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "assetController"
        },
        {
          "name": "to"
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "identityRegistry",
          "writable": true
        },
        {
          "name": "identityAccount"
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "walletIdentityAccount"
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "modifyUserRole",
      "discriminator": [
        108,
        235,
        68,
        252,
        229,
        247,
        71,
        185
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "assetAccessController",
          "relations": [
            "userRole",
            "authorizedUserRole"
          ]
        },
        {
          "name": "userRole",
          "writable": true
        },
        {
          "name": "authorizedUserRole",
          "optional": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "allowedAdminIxs",
          "type": "u64"
        },
        {
          "name": "allowedMediciIxs",
          "type": "u64"
        },
        {
          "name": "multisigAuthority",
          "type": {
            "option": "pubkey"
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
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "identityMetadataRegistryProgram",
          "address": "D2V7wTBbNCKgYwirgRUnSmc2QyKnHSVmRotWJ4rz8Jp9"
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
          "name": "policyEngineProgram"
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "eventAuthorityIdentityMetadataRegistry"
        },
        {
          "name": "eventAuthorityIdentityRegistry"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "removeIdentityAccount",
      "discriminator": [
        78,
        35,
        174,
        50,
        72,
        181,
        12,
        42
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
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
          "name": "eventAuthority"
        },
        {
          "name": "identityOwner"
        },
        {
          "name": "policyEngineProgram"
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "assetMint"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
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
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "identityMetadataRegistryProgram",
          "address": "D2V7wTBbNCKgYwirgRUnSmc2QyKnHSVmRotWJ4rz8Jp9"
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
        },
        {
          "name": "eventAuthorityIdentityMetadataRegistry"
        },
        {
          "name": "eventAuthorityIdentityRegistry"
        },
        {
          "name": "assetMint"
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
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "identityMetadataRegistryProgram",
          "address": "D2V7wTBbNCKgYwirgRUnSmc2QyKnHSVmRotWJ4rz8Jp9"
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
        },
        {
          "name": "eventAuthorityIdentityRegistry"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "removeLock",
      "discriminator": [
        1,
        17,
        121,
        74,
        62,
        241,
        127,
        120
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount"
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "removeUserRole",
      "discriminator": [
        43,
        242,
        133,
        94,
        48,
        124,
        214,
        153
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "assetAccessController",
          "relations": [
            "userRole",
            "authorizedUserRole"
          ]
        },
        {
          "name": "userRole",
          "writable": true
        },
        {
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "usersToRemove",
          "type": {
            "vec": "pubkey"
          }
        }
      ]
    },
    {
      "name": "revokeTokens",
      "discriminator": [
        215,
        42,
        15,
        134,
        173,
        80,
        33,
        21
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "writable": true,
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "assetControllerProgram",
          "address": "7tXjmbkZVY3Gmg9kDBebcNXT1yC5pyoxxXVLwdbv9tvP"
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "assetController"
        },
        {
          "name": "revokeTokenAccount",
          "writable": true
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount"
        },
        {
          "name": "trackerAccount",
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
          "name": "walletIdentityAccount"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "seizeTokens",
      "discriminator": [
        79,
        30,
        69,
        54,
        78,
        1,
        16,
        23
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "writable": true,
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "assetControllerProgram",
          "address": "7tXjmbkZVY3Gmg9kDBebcNXT1yC5pyoxxXVLwdbv9tvP"
        },
        {
          "name": "assetMint"
        },
        {
          "name": "assetController"
        },
        {
          "name": "destinationTokenAccount",
          "writable": true
        },
        {
          "name": "sourceTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "setCounters",
      "discriminator": [
        127,
        151,
        147,
        141,
        171,
        53,
        28,
        135
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "setLutAddress",
      "discriminator": [
        254,
        239,
        106,
        70,
        17,
        87,
        57,
        202
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "multisigAuthority",
          "signer": true
        },
        {
          "name": "assetAccessController",
          "writable": true,
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "lutAddress"
        }
      ],
      "args": []
    },
    {
      "name": "thawTokenAccount",
      "discriminator": [
        199,
        172,
        96,
        93,
        244,
        252,
        137,
        171
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "assetControllerProgram",
          "address": "7tXjmbkZVY3Gmg9kDBebcNXT1yC5pyoxxXVLwdbv9tvP"
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "assetController"
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "updateAssetMetadata",
      "discriminator": [
        217,
        98,
        205,
        153,
        242,
        4,
        41,
        76
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "writable": true,
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole"
        },
        {
          "name": "assetControllerProgram",
          "address": "7tXjmbkZVY3Gmg9kDBebcNXT1yC5pyoxxXVLwdbv9tvP"
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "assetController"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "updateControllerAdmin",
      "discriminator": [
        94,
        188,
        33,
        18,
        191,
        119,
        128,
        209
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "withdrawExcessRent",
      "discriminator": [
        20,
        25,
        71,
        58,
        107,
        60,
        159,
        75
      ],
      "accounts": [
        {
          "name": "receiver",
          "writable": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "controllerAuthority",
          "writable": true,
          "relations": [
            "assetAccessController"
          ]
        },
        {
          "name": "assetAccessController",
          "relations": [
            "authorizedUserRole"
          ]
        },
        {
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "assetAccessController",
      "discriminator": [
        159,
        84,
        3,
        26,
        90,
        167,
        134,
        33
      ]
    },
    {
      "name": "userRole",
      "discriminator": [
        62,
        252,
        194,
        137,
        183,
        165,
        147,
        28
      ]
    }
  ],
  "events": [
    {
      "name": "assignUserRoleEvent",
      "discriminator": [
        66,
        20,
        203,
        47,
        242,
        72,
        213,
        93
      ]
    },
    {
      "name": "removeUserRoleEvent",
      "discriminator": [
        213,
        162,
        73,
        7,
        11,
        89,
        226,
        140
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
      "name": "invalidName",
      "msg": "Invalid name"
    },
    {
      "code": 6002,
      "name": "invalidUserRole",
      "msg": "Invalid user role"
    },
    {
      "code": 6003,
      "name": "dataIsNotEmpty",
      "msg": "Data is not empty"
    },
    {
      "code": 6004,
      "name": "unknownAccount",
      "msg": "Unknown account discriminator"
    },
    {
      "code": 6005,
      "name": "missingReason",
      "msg": "Missing reason or code"
    },
    {
      "code": 6006,
      "name": "invalidLevel",
      "msg": "Invalid level"
    },
    {
      "code": 6007,
      "name": "illegalOperation",
      "msg": "Illegal operation"
    },
    {
      "code": 6008,
      "name": "invalidFlags",
      "msg": "Invalid flag bits"
    },
    {
      "code": 6009,
      "name": "cannotEmptyMasterRole",
      "msg": "Cannot empty master role of users"
    },
    {
      "code": 6010,
      "name": "cannotVoidAuthority",
      "msg": "Cannot void authority"
    },
    {
      "code": 6011,
      "name": "invalidMasterRole",
      "msg": "Invalid master role"
    },
    {
      "code": 6012,
      "name": "cannotDeleteMasterRole",
      "msg": "Cannot delete master role"
    },
    {
      "code": 6013,
      "name": "unauthorizedSigner",
      "msg": "Unauthorized admin signer"
    },
    {
      "code": 6014,
      "name": "missingMultisigAuthority",
      "msg": "Missing multisig authority"
    },
    {
      "code": 6015,
      "name": "invalidMultisigAuthority",
      "msg": "Invalid multisig authority"
    }
  ],
  "types": [
    {
      "name": "assetAccessController",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "controllerAuthority",
            "docs": [
              "PDA generated from [asset_access_controller] as seed to be used as signer authority."
            ],
            "type": "pubkey"
          },
          {
            "name": "controllerAuthorityBump",
            "docs": [
              "Bump seed for controller_authority."
            ],
            "type": "u8"
          },
          {
            "name": "admin",
            "docs": [
              "Admin keypair that's allowed to manage this controller."
            ],
            "type": "pubkey"
          },
          {
            "name": "assetMint",
            "docs": [
              "Asset mint that is going to be managed by this controller."
            ],
            "type": "pubkey"
          },
          {
            "name": "userRolesCount",
            "docs": [
              "Number of UserRoles created since initialization. Used for deriving all created UserRole PDAs."
            ],
            "type": "u64"
          },
          {
            "name": "hasMasterRole",
            "docs": [
              "Whether a master role exists."
            ],
            "type": "bool"
          },
          {
            "name": "lutAddress",
            "docs": [
              "Address of the lookup table."
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "assignUserRoleEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "addresses",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "role",
            "type": "string"
          },
          {
            "name": "roleId",
            "type": "u64"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "assetMint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "removeUserRoleEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "addresses",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "role",
            "type": "string"
          },
          {
            "name": "roleId",
            "type": "u64"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "assetMint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "userRole",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetAccessController",
            "docs": [
              "Controller that user role is designated for."
            ],
            "type": "pubkey"
          },
          {
            "name": "id",
            "docs": [
              "ID of UserRole. Matches AssetAccessController.user_roles_count at time of creation."
            ],
            "type": "u64"
          },
          {
            "name": "name",
            "docs": [
              "Name of this role."
            ],
            "type": "string"
          },
          {
            "name": "allowedAdminIxs",
            "docs": [
              "Bitflag of allowed admin instructions."
            ],
            "type": "u64"
          },
          {
            "name": "allowedMediciIxs",
            "docs": [
              "Bitflag of allowed Medici CPI instructions."
            ],
            "type": "u64"
          },
          {
            "name": "isMasterRole",
            "docs": [
              "If true, this is the master role."
            ],
            "type": "bool"
          },
          {
            "name": "users",
            "docs": [
              "List of users assigned with this role."
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "multisigAuthority",
            "docs": [
              "External authority that must co-sign operations protected by gated flags."
            ],
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    }
  ]
};
