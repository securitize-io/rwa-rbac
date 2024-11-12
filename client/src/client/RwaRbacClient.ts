import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { RwaRbac } from "../types/generated/rwa_rbac";
import * as IDL from "../types/generated/rwa_rbac.json";
import { Config } from "@bridgesplit/rwa-token-sdk/dist/classes/types";
import { RwaClient } from "@bridgesplit/rwa-token-sdk";
import { AssetController } from "./AssetController";

export class RwaRbacClient {
  rbacProgram: Program<RwaRbac>;
  rwaClient: RwaClient;
  assetController: AssetController;
  provider: AnchorProvider;

  constructor(config: Config, wallet: Wallet) {
    this.rwaClient = new RwaClient(config, wallet);
    this.provider = this.rwaClient.provider;
    this.rbacProgram = new Program(IDL as RwaRbac, this.provider);
    this.assetController = new AssetController(
      this.rwaClient,
      this.rbacProgram
    );
  }
}
