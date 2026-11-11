// Map helpers. Privacy rule: the private street address is never used here.
type Loc = {
  area: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  showExactLocation: boolean;
  address?: string | null; // accepted but deliberately ignored
};

export function propertyMapQuery(p: Loc): { query: string; zoom: number; exact: boolean } {
  if (p.showExactLocation && p.latitude != null && p.longitude != null) {
    return { query: `${p.latitude},${p.longitude}`, zoom: 15, exact: true };
  }
  return { query: `${p.area}, ${p.city}`, zoom: 13, exact: false };
}

export const mapEmbedUrl = (query: string, zoom = 14) =>
  `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;

export const mapsLink = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
