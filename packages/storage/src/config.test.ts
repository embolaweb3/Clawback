import { describe, expect, it } from "vitest";
import { createStorageClient } from "./index.js";
import { loadStorageConfig } from "./config.js";

describe("loadStorageConfig", () => {
  it("returns null when ZG_STORAGE_PRIVATE_KEY is absent", () => {
    expect(loadStorageConfig({})).toBeNull();
  });

  it("fills in the default testnet indexer and RPC when a key is present", () => {
    const config = loadStorageConfig({ ZG_STORAGE_PRIVATE_KEY: "0xabc" });
    expect(config?.indexerRpc).toBe("https://indexer-storage-testnet-turbo.0g.ai");
    expect(config?.evmRpcUrl).toBe("https://evmrpc-testnet.0g.ai");
  });
});

describe("createStorageClient", () => {
  it("degrades to null instead of throwing when unconfigured", () => {
    expect(createStorageClient({})).toBeNull();
  });
});
