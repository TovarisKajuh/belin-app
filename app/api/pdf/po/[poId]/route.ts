import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";

// Serving a generated document, under the access matrix from the completion
// plan. Three rules hold for every PDF route:
//
// 1. PERSON SESSIONS ONLY. A project link is refused even though it can read
//    the project's own screens, because a link gets forwarded to WhatsApp
//    groups and a priced contract is not something to hand out by link.
// 2. No token ever appears in the URL. URLs land in server logs, browser
//    history and the referrer header of whatever the reader opens next.
// 3. The document is fetched from private storage by the server and streamed
//    through, so no signed storage URL escapes into the page at all.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ poId: string }> },
) {
  const { poId } = await params;
  if (!isUuid(poId)) return new NextResponse("Not found", { status: 404 });

  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  // Crew people never receive documents: the office reads the paperwork.
  if (actor.role === "crew") return new NextResponse("Forbidden", { status: 403 });

  const db = createAdminClient();
  const { data: po } = await db
    .from("purchase_orders")
    .select("id, project_id, number, pdf_path")
    .eq("id", poId)
    .maybeSingle();
  if (!po || !po.pdf_path) return new NextResponse("Not found", { status: 404 });

  // The project gate decides membership; a person outside both organizations
  // gets the same 404 as a document that does not exist, so the route never
  // confirms that somebody else's naročilnica is real.
  try {
    await requireProjectActor(actor, po.project_id);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await db.storage.from("reports").download(po.pdf_path);
  if (file.error || !file.data) return new NextResponse("Not found", { status: 404 });

  const bytes = new Uint8Array(await file.data.arrayBuffer());

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="narocilnica-${po.number}.pdf"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
