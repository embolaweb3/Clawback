export * from "./config.js";
export * from "./storageClient.js";

import { loadStorageConfig } from "./config.js";
import { StorageClient } from "./storageClient.js";

/** Returns null — not a throw — when 0G Storage isn't configured, so
 *  callers (packages/agent) can degrade to "storageRootHash: null"
 *  honestly rather than crashing a case that would otherwise succeed. */
export function createStorageClient(env: NodeJS.ProcessEnv = process.env): StorageClient | null {
  const config = loadStorageConfig(env);
  return config ? new StorageClient(config) : null;
}
