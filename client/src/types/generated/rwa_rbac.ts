/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/rwa_rbac.json`.
 */
export type RwaRbac = {
  "address": "9gUXb1jJ4wmwht3G6mMaHdWbo2gf7faHYyM6ryVGy4ae",
  "metadata": {
    "name": "rwaRbac",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addLevelToIdentityAccount",
      "discriminator": [
        102,
        204,
        64,
        169,
        252,
        177,
        192,
        232
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
          "name": "authorizedUserRole",
          "optional": true
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
      "name": "attachToPolicyAccount",
      "discriminator": [
        247,
        116,
        130,
        17,
        89,
        232,
        103,
        16
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
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "policyEngineProgram",
          "address": "po1cPf1eyUJJPqULw4so3T4JU9pdFn83CDyuLEKFAau"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "policyAccount",
          "writable": true
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
      "name": "closeMintAccount",
      "discriminator": [
        14,
        121,
        72,
        246,
        96,
        224,
        42,
        162
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
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "assetControllerProgram",
          "address": "acpcFrzEYKjVLvZGWueTV8vyDjhu3oKC7sN38QELLan"
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "assetController"
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
                "kind": "arg",
                "path": "uniqueSeed"
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "uniqueSeed",
          "type": "u64"
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
          "name": "authorizedUserRole",
          "optional": true
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
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "createPolicyAccount",
      "discriminator": [
        52,
        228,
        143,
        138,
        102,
        135,
        59,
        193
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
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "policyEngineProgram",
          "address": "po1cPf1eyUJJPqULw4so3T4JU9pdFn83CDyuLEKFAau"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "policyAccount",
          "writable": true
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
        }
      ]
    },
    {
      "name": "detachFromPolicyAccount",
      "discriminator": [
        81,
        24,
        116,
        10,
        12,
        108,
        109,
        242
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
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "policyEngineProgram",
          "address": "po1cPf1eyUJJPqULw4so3T4JU9pdFn83CDyuLEKFAau"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "policyAccount",
          "writable": true
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
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "assetControllerProgram",
          "address": "acpcFrzEYKjVLvZGWueTV8vyDjhu3oKC7sN38QELLan"
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
          "name": "assetControllerProgram",
          "address": "acpcFrzEYKjVLvZGWueTV8vyDjhu3oKC7sN38QELLan"
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
      "name": "removeLevelFromIdentityAccount",
      "discriminator": [
        194,
        231,
        187,
        54,
        197,
        136,
        170,
        55
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
          "name": "authorizedUserRole",
          "optional": true
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
          "name": "cpiData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "revokeIdentityAccount",
      "discriminator": [
        77,
        88,
        182,
        61,
        235,
        49,
        2,
        137
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
          "name": "authorizedUserRole",
          "optional": true
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
          "name": "cpiData",
          "type": "bytes"
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
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "assetControllerProgram",
          "address": "acpcFrzEYKjVLvZGWueTV8vyDjhu3oKC7sN38QELLan"
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "assetController"
        },
        {
          "name": "authorityTokenAccount",
          "writable": true
        },
        {
          "name": "revokeTokenAccount",
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
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "assetControllerProgram",
          "address": "acpcFrzEYKjVLvZGWueTV8vyDjhu3oKC7sN38QELLan"
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
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "assetControllerProgram",
          "address": "acpcFrzEYKjVLvZGWueTV8vyDjhu3oKC7sN38QELLan"
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
      "name": "updateInterestBearingMintRate",
      "discriminator": [
        29,
        174,
        109,
        163,
        227,
        75,
        2,
        144
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
          "name": "authorizedUserRole",
          "optional": true
        },
        {
          "name": "assetControllerProgram",
          "address": "acpcFrzEYKjVLvZGWueTV8vyDjhu3oKC7sN38QELLan"
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
  "errors": [
    {
      "code": 6000,
      "name": "unknownInstruction",
      "msg": "Unknown program instruction from CPI data"
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
            "name": "uniqueSeed",
            "docs": [
              "Unique seed used for creating this account."
            ],
            "type": "u64"
          },
          {
            "name": "userRolesCount",
            "docs": [
              "Number of UserRoles created. Used for deriving all created UserRole PDAs."
            ],
            "type": "u64"
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
            "name": "users",
            "docs": [
              "List of users assigned with this role."
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    }
  ]
};
