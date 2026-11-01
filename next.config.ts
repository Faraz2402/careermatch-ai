import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  serverExternalPackages: ["@prisma/client", "unpdf", "mammoth"],
  webpack(config, { dev }) {
    // The SQLite database lives in prisma/; writes to it must not trigger HMR.
    if (dev) config.watchOptions = { ...config.watchOptions, ignored: ["**/node_modules/**", "**/.git/**", "**/prisma/*.db*"] };
    return config;
  },
};

export default nextConfig;
