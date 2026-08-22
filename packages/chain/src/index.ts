export * from "./config.js";
export * from "./abi.js";
export * from "./anchorClient.js";

import { loadChainConfig } from "./config.js";
import { AnchorClient } from "./anchorClient.js";

/** Returns null when unconfigured — see LIMITATIONS.md. */
export function createAnchorClient(env: NodeJS.ProcessEnv = process.env): AnchorClient | null {
  const config = loadChainConfig(env);
  return config ? new AnchorClient(config) : null;
}
