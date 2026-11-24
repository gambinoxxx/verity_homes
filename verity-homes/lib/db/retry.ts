// Retry READ queries on a dropped database connection (Unit 20b). Neon connections sometimes
// drop (seen in e2e as the driver's `Error: [object ErrorEvent]`, open question 57); without a
// retry that one request becomes an error page. Pure (no Prisma, no env) so it is unit-tested;
// lib/db/client.ts wires it in with a Prisma query extension.
//
// Writes are NEVER retried: a write whose answer was lost may have been applied, and running
// it again could duplicate it.

/** Prisma model operations that only read. Everything else (create, update, upsert, delete…) is a write. */
export const READ_OPERATIONS: ReadonlySet<string> = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

/** Waits before retry 1 and retry 2 (ms). */
export const RETRY_DELAYS_MS = [150, 400] as const;

/** Transient connection failures, by what the driver / Prisma says. Label → pattern. */
const TRANSIENT: [label: string, pattern: RegExp][] = [
  ["fetch failed", /fetch failed/i],
  ["ECONNRESET", /ECONNRESET/],
  ["socket closed", /socket (?:hang up|closed)|other side closed|Connection terminated|P1017/i],
  ["terminating connection", /terminating connection/i],
  ["websocket error", /\[object ErrorEvent\]/],
];

/** Every message / code in the error and its causes (Prisma wraps the driver's error). */
function texts(e: unknown, depth = 0): string[] {
  if (depth > 4 || e == null) return [];
  if (typeof e === "string") return [e];
  if (typeof e !== "object") return [];
  const o = e as Record<string, unknown>;
  const own = [o.message, o.code, o.name].filter((v): v is string => typeof v === "string");
  const meta = o.meta as Record<string, unknown> | undefined;
  return [...own, ...texts(o.cause, depth + 1), ...texts(meta?.driverAdapterError, depth + 1)];
}

/**
 * Why this error looks like a dropped connection (a short label, safe to log — never the raw
 * message, which could name the host), or null when it is anything else (a bad query, a
 * constraint, a timeout from a slow query…) and must not be retried.
 */
export function transientReason(e: unknown): string | null {
  const all = texts(e).join("\n");
  for (const [label, pattern] of TRANSIENT) if (pattern.test(all)) return label;
  return null;
}

/** Retry only reads, only on transient connection errors, at most RETRY_DELAYS_MS.length times. */
export function shouldRetry(operation: string, error: unknown, attempt: number): boolean {
  return (
    attempt < RETRY_DELAYS_MS.length &&
    READ_OPERATIONS.has(operation) &&
    transientReason(error) !== null
  );
}

type RetryDeps = {
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Runs `run`, retrying a read after a transient connection error (~150 ms, then ~400 ms). */
export async function withReadRetry<T>(
  model: string,
  operation: string,
  run: () => Promise<T>,
  { sleep = defaultSleep, log = (m) => console.warn(m) }: RetryDeps = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (e) {
      if (!shouldRetry(operation, e, attempt)) throw e;
      const delay = RETRY_DELAYS_MS[attempt]!;
      log(
        `db: ${model}.${operation} failed (${transientReason(e)}); retry ${attempt + 1}/${RETRY_DELAYS_MS.length} in ${delay} ms`,
      );
      await sleep(delay);
    }
  }
}
