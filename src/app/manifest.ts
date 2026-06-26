import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Peptra",
    short_name: "Peptra",
    description: "Precision for every protocol.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#16102E",
    theme_color: "#7C3AED",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      // Scalable source (Chrome accepts SVG with sizes:"any").
      {
        src: "/peptra-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      // Raster fallbacks for installability / Lighthouse / Android.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
