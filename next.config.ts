import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: no server. Deploys as plain files to Cloudflare Pages.
  // Persistence is in the browser (IndexedDB), so nothing runs server-side.
  output: "export",
  agentRules: false,
};

export default nextConfig;
