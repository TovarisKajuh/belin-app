import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";

// Serving a generated report. Person sessions only, crew never, and the bytes
// are streamed by the server so no signed storage URL escapes into a page.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;
  if (!isUuid(docId)) return new NextResponse("Not found", { status: 404 });

  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person" || actor.role === "crew") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const db = createAdminClient();
  const { data: doc } = await db
    .from("generated_documents")
    .select("id, project_id, kind, storage_path")
    .eq("id", docId)
    .maybeSingle();
  if (!doc || doc.storage_path === "pending") return new NextResponse("Not found", { status: 404 });

  try {
    await requireProjectActor(actor, doc.project_id);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await db.storage.from("reports").download(doc.storage_path);
  if (file.error || !file.data) return new NextResponse("Not found", { status: 404 });

  const bytes = new Uint8Array(await file.data.arrayBuffer());

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.kind}.pdf"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
