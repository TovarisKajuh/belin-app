import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Belin",
    short_name: "Belin",
    description: "Collaboration between solar EPCs and their installation subcontractors.",
    // THE ICON OPENS THE APP, NOT THE PITCH.
    //
    // This was "/", the landing page, so a crew member who installed Belin
    // tapped his icon every morning and got a marketing page with a sign-in
    // button on it. The landing page and the app are two different things and
    // the icon belongs to the app.
    //
    // Unprefixed on purpose: /app redirects to /sl/app, /de/app or /en/app by
    // the phone's own language, so one manifest serves all three. Signed out it
    // redirects again to /login, which makes the installed app a login screen
    // and nothing else until you are in, which is exactly right. A crew person
    // with one project lands on that roof; with several, on his picker.
    //
    // Visiting the site in a browser is untouched: "/" still serves the pitch.
    start_url: "/app",
    // The whole origin, so a link into any project or document opens inside the
    // installed app rather than kicking the user out to a browser tab.
    scope: "/",
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
