import { AnchorProvider } from "@coral-xyz/anchor";
import { getIdentityMetadataPda } from "./setup";
import { getIdentityRegistryProgram } from "../deps/rwa-token/clients/rwa-token-sdk/src";

export async function getIdentityMetadata(
  assetMint: string,
  level: number,
  provider: AnchorProvider
) {
  const identityRegistryProgram = getIdentityRegistryProgram(provider);
  const identityMetadataPda = getIdentityMetadataPda(assetMint, level);
  return identityRegistryProgram.account.identityMetadataAccount
    .fetch(identityMetadataPda)
    .then((account) => account)
    .catch(() => undefined);
}
