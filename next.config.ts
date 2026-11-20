import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
