export interface ChainConfig {
  readonly rpcUrl: string;
  readonly privateKey: string;
  readonly contractAddress: string;
}

/** Returns null when unconfigured (no deployed contract address, or no
 *  key) — see LIMITATIONS.md on why this repository ships CaseAnchor.sol
 *  without deploying it. */
export function loadChainConfig(env: NodeJS.ProcessEnv = process.env): ChainConfig | null {
  const contractAddress = env.ZG_CHAIN_ANCHOR_CONTRACT_ADDRESS;
  const privateKey = env.ZG_CHAIN_PRIVATE_KEY;
  if (!contractAddress || !privateKey) return null;
  return {
    rpcUrl: env.ZG_CHAIN_RPC_URL ?? "https://evmrpc-testnet.0g.ai",
    privateKey,
    contractAddress,
  };
}
