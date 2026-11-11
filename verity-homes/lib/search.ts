// Home search bar → URL. Unit 5 parses these params (type, area, ptype) with Zod.
export type SearchTab = "buy" | "rent" | "land" | "invest";

export const SEARCH_TABS: readonly { id: SearchTab; label: string }[] = [
  { id: "buy", label: "Buy" },
  { id: "rent", label: "Rent" },
  { id: "land", label: "Land" },
  { id: "invest", label: "Invest" },
];

/** Property types offered in the home search (design/index.html), as PropertyType values. */
export const SEARCH_PROPERTY_TYPES = [
  { value: "DETACHED", label: "Detached" },
  { value: "SEMI_DETACHED", label: "Semi-detached" },
  { value: "TERRACE", label: "Terrace" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "LAND", label: "Land" },
] as const;

const TYPE_PARAM: Record<Exclude<SearchTab, "invest">, string> = {
  buy: "sale",
  rent: "rent",
  land: "land",
};

/** Where the search form goes. Empty fields are left out; the Invest tab goes to /invest. */
export function searchHref(tab: SearchTab, fields: { area?: string; ptype?: string }): string {
  if (tab === "invest") return "/invest";
  const params = new URLSearchParams({ type: TYPE_PARAM[tab] });
  const area = fields.area?.trim();
  if (area) params.set("area", area);
  if (fields.ptype) params.set("ptype", fields.ptype);
  return `/properties?${params.toString()}`;
}
