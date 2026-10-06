import { NextResponse, type NextRequest } from "next/server";
import { verifyGuestPayload, GUEST_SESSION_TTL_MS } from "@/lib/demo/door";
import { DEMO_PROJECTS, safeDemoLocale } from "@/lib/demo/personas";
import { startDemoPersonaSession } from "@/lib/demo/session";

export const dynamic = "force-dynamic";

/**
 * A phone in the room scanned the guest QR. It becomes Miha Oblak, crew of the
 * demo subcontractor, for two hours: no email typed, no account created, and no
 * presenter cookie, so it can never switch itself into the EPC office (D18).
 * Every refusal looks the same from outside: the "code expired" page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; sig: string }> },
) {
  const { locale: rawLocale, sig } = await params;
  const locale = safeDemoLocale(rawLocale);
  const origin = request.nextUrl.origin;
  const expired = NextResponse.redirect(new URL(`/${locale}/demo/gost`, origin), 303);

  const payload = verifyGuestPayload(decodeURIComponent(sig));
  if (!payload) return expired;

  const result = await startDemoPersonaSession("guest", { ttlMs: GUEST_SESSION_TTL_MS, presenter: false });
  if (result !== "ok") return expired;

  return NextResponse.redirect(new URL(`/${locale}/app/${DEMO_PROJECTS[payload.project]}`, origin), 303);
}
