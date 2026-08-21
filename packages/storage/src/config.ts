export interface StorageConfig {
  readonly indexerRpc: string;
  readonly evmRpcUrl: string;
  readonly privateKey: string;
}

/** Returns null when unconfigured — same contract as
 *  packages/compute/src/config.ts. See LIMITATIONS.md. */
export function loadStorageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig | null {
  const privateKey = env.ZG_STORAGE_PRIVATE_KEY;
  if (!privateKey) return null;
  return {
    indexerRpc: env.ZG_STORAGE_INDEXER_RPC ?? "https://indexer-storage-testnet-turbo.0g.ai",
    evmRpcUrl: env.ZG_EVM_RPC_URL ?? "https://evmrpc-testnet.0g.ai",
    privateKey,
  };
}
