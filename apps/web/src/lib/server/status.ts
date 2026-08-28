import { loadComputeConfig } from "@clawback/compute";
import { loadStorageConfig } from "@clawback/storage";
import { loadChainConfig } from "@clawback/chain";

/**
 * Derives a human-readable 0G network label from an RPC URL this app is
 * actually configured to use — never guessed, never hardcoded to "live".
 * The two hostnames below are the real 0G endpoints this codebase has
 * been exercised against (see README.md "Live 0G verification"); any
 * other RPC URL is reported as "custom" rather than assumed to be either.
 */
function describeNetwork(rpcUrl: string): {
  readonly network: "mainnet" | "testnet" | "custom";
  readonly chainId: number | null;
  readonly explorerBase: string | null;
} {
  if (rpcUrl.includes("evmrpc-testnet.0g.ai")) {
    return { network: "testnet", chainId: 16602, explorerBase: "https://chainscan-galileo.0g.ai" };
  }
  if (rpcUrl.includes("evmrpc.0g.ai")) {
    return { network: "mainnet", chainId: 16661, explorerBase: "https://chainscan.0g.ai" };
  }
  return { network: "custom", chainId: null, explorerBase: null };
}

export interface ComponentStatus {
  readonly configured: boolean;
  readonly network: "mainnet" | "testnet" | "custom" | null;
  readonly chainId: number | null;
  readonly explorerBase: string | null;
}

export interface IntegrationStatus {
  readonly compute: ComponentStatus;
  readonly storage: ComponentStatus;
  readonly chain: ComponentStatus & { readonly contractAddress: string | null };
}

const UNCONFIGURED: ComponentStatus = { configured: false, network: null, chainId: null, explorerBase: null };

/**
 * Read-only, server-side-only status of the three 0G integrations, derived
 * from the exact same `loadXConfig()` functions each package already uses
 * to decide "configured" vs. "unconfigured" — this file adds no new
 * configuration source and no new decision logic, only a safe read of an
 * existing one for display purposes. Never includes a private key.
 */
export function getIntegrationStatus(env: NodeJS.ProcessEnv = process.env): IntegrationStatus {
  const compute = loadComputeConfig(env);
  const storage = loadStorageConfig(env);
  const chain = loadChainConfig(env);

  return {
    compute: compute ? { configured: true, ...describeNetwork(compute.rpcUrl) } : UNCONFIGURED,
    storage: storage ? { configured: true, ...describeNetwork(storage.evmRpcUrl) } : UNCONFIGURED,
    chain: chain
      ? { configured: true, ...describeNetwork(chain.rpcUrl), contractAddress: chain.contractAddress }
      : { ...UNCONFIGURED, contractAddress: null },
  };
}
