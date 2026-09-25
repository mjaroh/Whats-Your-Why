import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keep the Anthropic SDK and Postgres driver out of any client bundle.
  serverExternalPackages: ["@anthropic-ai/sdk", "postgres"],
};

export default nextConfig;
