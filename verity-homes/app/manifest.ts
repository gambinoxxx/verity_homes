import type { MetadataRoute } from "next";

// Brand navy (--bg-navy in app/globals.css). Icons are copies of brand/web-icons/icon-*.png.
const NAVY = "#0a1a33";

/** /manifest.webmanifest: install name, colours and icons. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Verity Homes and Properties",
    short_name: "Verity",
    start_url: "/",
    display: "standalone",
    theme_color: NAVY,
    background_color: NAVY,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
