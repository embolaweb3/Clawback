/**
 * Deploys CaseAnchor.sol to 0G Chain.
 *
 * NOT run by this repository's install/test/build scripts. Deployment is
 * a deliberate, one-time, operator-initiated action requiring a funded
 * key — see LIMITATIONS.md. This file exists so the deployment path is
 * concrete and reviewable, not so it runs automatically.
 *
 * Usage (once you have solc-compiled bytecode/ABI and a funded testnet
 * key):
 *
 *   ZG_CHAIN_PRIVATE_KEY=0x... \
 *   ZG_CHAIN_RPC_URL=https://evmrpc-testnet.0g.ai \
 *   node --experimental-strip-types packages/chain/scripts/deploy.ts
 *
 * This script deliberately does not vendor a Solidity compiler — compile
 * contracts/CaseAnchor.sol with your toolchain of choice (solc, Foundry,
 * Hardhat) and paste the resulting ABI/bytecode below before running.
 */
import { ethers } from "ethers";

const ABI: unknown[] = []; // paste the compiled ABI here
const BYTECODE = ""; // paste the compiled bytecode (0x...) here

async function main() {
  if (!BYTECODE) {
    throw new Error(
      "packages/chain/scripts/deploy.ts is a template. Compile contracts/CaseAnchor.sol " +
        "and paste the ABI/bytecode into this file before deploying.",
    );
  }
  const rpcUrl = process.env.ZG_CHAIN_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
  const privateKey = process.env.ZG_CHAIN_PRIVATE_KEY;
  if (!privateKey) throw new Error("Set ZG_CHAIN_PRIVATE_KEY to a funded testnet key first.");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const factory = new ethers.ContractFactory(ABI, BYTECODE, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`CaseAnchor deployed at ${address}`);
  console.log(`Set ZG_CHAIN_ANCHOR_CONTRACT_ADDRESS=${address} in your .env`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
