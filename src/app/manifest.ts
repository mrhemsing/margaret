import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DailyCall",
    short_name: "DailyCall",
    description: "Friendly daily phone calls for aging parents, with simple updates for families.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#edf6fb",
    theme_color: "#12354f",
    icons: [
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
