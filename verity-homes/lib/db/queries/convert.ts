// Converters used by the query layer so BigInt and Decimal never leave lib/db.
import "server-only";
import { z } from "zod";

type DecimalLike = { toNumber(): number };

export const koboToNumber = (v: bigint): number => Number(v);
export const optionalKoboToNumber = (v: bigint | null): number | null =>
  v === null ? null : Number(v);
export const decimalToNumber = (v: DecimalLike): number => v.toNumber();
export const optionalDecimalToNumber = (v: DecimalLike | null): number | null =>
  v === null ? null : v.toNumber();

// Property.nearby is free-form JSON: validate it at the boundary and drop anything malformed.
const nearbySchema = z.array(
  z.object({ place: z.string().min(1), minutes: z.number().nonnegative() }),
);
export type NearbyPlace = z.infer<typeof nearbySchema>[number];

export function parseNearby(value: unknown): NearbyPlace[] {
  const parsed = nearbySchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}
