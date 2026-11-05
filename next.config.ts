import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify's OpenNext adapter owns its deployment output; containers use standalone.
  ...(process.env.NETLIFY === "true" ? {} : { output: "standalone" as const }),
  poweredByHeader: false,
  devIndicators: false,
};

export default nextConfig;
