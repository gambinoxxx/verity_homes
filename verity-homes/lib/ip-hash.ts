// Rate-limit key: sha256(ip + IP_HASH_SALT). The raw IP is never stored.
import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";

/** Client IP from the request headers (Vercel sets x-forwarded-for / x-real-ip). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export function hashIp(ip: string, salt: string = env.IP_HASH_SALT): string {
  return createHash("sha256")
    .update(ip + salt)
    .digest("hex");
}
