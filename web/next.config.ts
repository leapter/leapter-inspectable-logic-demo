import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@leapter/client"],
  devIndicators: false,
};

export default nextConfig;
