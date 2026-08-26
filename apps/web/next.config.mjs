/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@clawback/shared",
    "@clawback/privacy",
    "@clawback/providers",
    "@clawback/compute",
    "@clawback/storage",
    "@clawback/chain",
    "@clawback/payments",
    "@clawback/receipts",
    "@clawback/agent",
  ],
  // The 0G Storage/Compute SDKs pull in Node-only modules (fs, crypto,
  // child process helpers for the fine-tuning path we don't use). Keep
  // them server-only so the client bundle never tries to include them.
  serverExternalPackages: ["@0gfoundation/0g-compute-ts-sdk", "@0gfoundation/0g-storage-ts-sdk"],
  webpack(config) {
    // The workspace packages use explicit `.js` extensions on relative
    // imports (required for Node ESM resolution when running under
    // vitest/tsx directly) even though the actual files on disk are
    // `.ts`. Webpack's default resolution doesn't map that back — this
    // alias teaches it to try `.ts`/`.tsx` when a literal `.js` import
    // doesn't exist, without changing how the packages are written.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
