import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ytsort/core"],
  // Lets the dev server accept requests proxied through the Cloudflare
  // tunnel (ytsort.slashsam.net) instead of only localhost.
  allowedDevOrigins: ["ytsort.slashsam.net"],
};

export default nextConfig;
