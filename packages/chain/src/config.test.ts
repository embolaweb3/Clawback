import { describe, expect, it } from "vitest";
import { createAnchorClient, loadChainConfig } from "./index.js";

describe("loadChainConfig", () => {
  it("returns null when the contract address is not configured", () => {
    expect(loadChainConfig({ ZG_CHAIN_PRIVATE_KEY: "0xabc" })).toBeNull();
  });

  it("returns null when the private key is not configured", () => {
    expect(loadChainConfig({ ZG_CHAIN_ANCHOR_CONTRACT_ADDRESS: "0xdead" })).toBeNull();
  });

  it("returns a config only when both are present", () => {
    const config = loadChainConfig({
      ZG_CHAIN_ANCHOR_CONTRACT_ADDRESS: "0xdead",
      ZG_CHAIN_PRIVATE_KEY: "0xabc",
    });
    expect(config?.contractAddress).toBe("0xdead");
    expect(config?.rpcUrl).toBe("https://evmrpc-testnet.0g.ai");
  });
});

describe("createAnchorClient", () => {
  it("degrades to null instead of throwing when unconfigured", () => {
    expect(createAnchorClient({})).toBeNull();
  });
});
