import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Belin",
    short_name: "Belin",
    description: "Collaboration between solar EPCs and their installation subcontractors.",
    start_url: "/",
    display: "standalone",
    // Matches the dark launch animation background (BelinSplash) so the native
    // PWA splash flows seamlessly into the animated one on mobile cold start.
    background_color: "#0b1524",
    // Dark, so the installed app's system chrome matches it instead of showing
    // a near-white bar above the app.
    theme_color: "#0b1524",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
