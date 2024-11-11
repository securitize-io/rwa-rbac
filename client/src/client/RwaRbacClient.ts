import { BN, Idl, Program, Provider, Wallet } from "@coral-xyz/anchor";
import { RwaRbac } from "../types/generated/rwa_rbac";
import * as IDL from "../types/generated/rwa_rbac.json";
import { Config } from "@bridgesplit/rwa-token-sdk/dist/classes/types";
import { RwaClient } from "@bridgesplit/rwa-token-sdk";

export enum Network {
  mainnet,
  devnet,
}

export class AssetController {
  constructor() {}

  setupNewRegistry() {
    console.log("hi");
  }
}

export class RwaRbacClient {
  rbacProgram: Program<RwaRbac>;
  rwaClient: RwaClient;
  assetController: AssetController;

  constructor(config: Config, wallet: Wallet) {
    this.rwaClient = new RwaClient(config, wallet);
    this.rbacProgram = new Program(IDL as RwaRbac, this.rwaClient.provider);
    this.assetController = new AssetController();
  }
}
