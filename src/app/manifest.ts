import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Peptra",
    short_name: "Peptra",
    description: "Precision for every protocol.",
    start_url: "/",
    display: "standalone",
    background_color: "#16102E",
    theme_color: "#7C3AED",
    icons: [
      {
        src: "/peptra-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
