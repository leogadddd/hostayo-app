import type { MetadataRoute } from "next";

// Lets the app be installed to a phone's home screen and opened like any other
// app. The service worker (public/sw.js) is what lets it open without a network.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hostayo",
    short_name: "Hostayo",
    description:
      "Bookings, payments, turnovers and expenses for short-stay hosts.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f3ed",
    theme_color: "#203a35",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
