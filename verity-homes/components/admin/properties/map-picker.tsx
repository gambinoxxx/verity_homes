"use client";

// Map picker (Unit 15): react-leaflet + OpenStreetMap tiles. Loaded with next/dynamic
// (ssr: false) because Leaflet needs `window`. A custom gold divIcon pin — Leaflet's default
// marker images break under bundlers. Click the map or drag the pin → onPick(lat, lng);
// changing lat/lng from outside (typing, "Centre on area") moves the pin and pans to it.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import styles from "./editor.module.css";

/** Lagos (no pin yet). */
const LAGOS: [number, number] = [6.5244, 3.3792];

const PIN_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>';

type Props = {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  label: string;
};

function ClickToPick({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

/** Pans to the pin when it moves from outside the map (typed coordinates, geocoding). */
function FollowPin({ position }: { position: [number, number] | null }) {
  const map = useMap();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!position) return;
    const key = position.join(",");
    if (key === last.current) return;
    last.current = key;
    if (!map.getBounds().contains(position)) map.setView(position, Math.max(map.getZoom(), 15));
  }, [map, position]);
  return null;
}

export default function MapPicker({ lat, lng, onPick, label }: Props) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: styles.pin,
        html: PIN_SVG,
        iconSize: [36, 36],
        iconAnchor: [18, 34],
      }),
    [],
  );
  const position: [number, number] | null = lat !== null && lng !== null ? [lat, lng] : null;

  return (
    <MapContainer
      center={position ?? LAGOS}
      zoom={position ? 15 : 11}
      scrollWheelZoom={false}
      aria-label={label}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPick onPick={onPick} />
      <FollowPin position={position} />
      {position ? (
        <Marker
          position={position}
          icon={icon}
          draggable
          keyboard={false}
          title="Property location — drag to adjust"
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              onPick(p.lat, p.lng);
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
