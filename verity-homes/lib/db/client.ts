// Single Prisma client for the whole app (reused across hot reloads in dev).
// Only files inside lib/db/ may import this.
import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { env } from "@/lib/env";
import { withReadRetry } from "@/lib/db/retry";

// Reads (findMany, count, …) are retried up to twice on a dropped connection; writes never are
// (lib/db/retry.ts). Inside an interactive transaction a retried read fails again at once if the
// transaction's connection is gone, so the error still reaches the caller.
const createClient = () =>
  new PrismaClient({ adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }) }).$extends({
    name: "read-retry",
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          return withReadRetry(model, operation, () => query(args));
        },
      },
    },
  });

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
