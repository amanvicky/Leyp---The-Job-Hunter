import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Use webpack instead of Turbopack due to internal error
  experimental: {
    forceSwcTransforms: true,
  },
  // The generated Prisma client is large and server-only; keep it out of the
  // client bundle explicitly rather than relying on tree shaking.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-better-sqlite3", "better-sqlite3"],
};

export default nextConfig;
