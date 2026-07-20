import "server-only";

/**
 * The site's own base URL, for building links that get emailed.
 *
 * Deliberately NOT derived from the request's Host header. A poisoned Host is a
 * classic way to steal an account: the attacker triggers a password or login
 * email for someone else, the link is built from their header, and the victim
 * clicks a live token straight into the attacker's server. The two sources
 * below are both set by us or by the platform, and neither can be influenced by
 * whoever is making the request.
 *
 * 1. NEXT_PUBLIC_APP_URL, when configured. Always wins, so a custom domain can
 *    override the Vercel one without touching code.
 * 2. VERCEL_PROJECT_PRODUCTION_URL, injected by Vercel as the project's stable
 *    production hostname. This is what keeps the deployed site working with no
 *    manual configuration at all.
 *
 * Returns null when neither exists, and callers refuse to send rather than
 * emailing a link that points nowhere.
 */
export function appBaseUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return stripTrailingSlash(configured);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${stripTrailingSlash(vercel)}`;

  return null;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
