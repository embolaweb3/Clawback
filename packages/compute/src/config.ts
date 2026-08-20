export interface ComputeConfig {
  readonly privateKey: string;
  readonly rpcUrl: string;
  readonly preferredProviderAddress: string | null;
}

/**
 * Returns null — deliberately, not an exception — when 0G Compute isn't
 * configured. Every caller in this package must treat null as a normal,
 * expected state (local development, CI, a demo without funded testnet
 * credentials) and degrade to the honest "not attested" path rather than
 * throwing. See LIMITATIONS.md.
 */
export function loadComputeConfig(env: NodeJS.ProcessEnv = process.env): ComputeConfig | null {
  const privateKey = env.ZG_COMPUTE_PRIVATE_KEY;
  if (!privateKey) return null;
  return {
    privateKey,
    rpcUrl: env.ZG_EVM_RPC_URL ?? "https://evmrpc-testnet.0g.ai",
    preferredProviderAddress: env.ZG_COMPUTE_PROVIDER_ADDRESS ?? null,
  };
}
