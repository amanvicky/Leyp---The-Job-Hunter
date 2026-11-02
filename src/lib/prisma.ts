import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 takes its connection through an adapter rather than a URL in the
 * schema. SQLite keeps local development to a single file with no daemon.
 */
function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
    log: ["warn", "error"],
  });
}

const globalForPrisma = globalThis as unknown as { leypPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.leypPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.leypPrisma = prisma;
