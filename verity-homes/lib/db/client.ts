// Single Prisma client for the whole app (reused across hot reloads in dev).
// Only files inside lib/db/ may import this.
import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { env } from "@/lib/env";

const createClient = () =>
  new PrismaClient({ adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }) });

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
