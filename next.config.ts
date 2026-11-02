import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root: a lockfile further up the tree otherwise makes
  // Turbopack guess.
  turbopack: { root: __dirname },
  // The generated Prisma client is large and server-only; keep it out of the
  // client bundle explicitly rather than relying on tree shaking.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-better-sqlite3", "better-sqlite3"],
};

export default nextConfig;
