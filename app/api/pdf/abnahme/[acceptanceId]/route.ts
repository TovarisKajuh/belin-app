import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";

// The signed acceptance protocol. Stored at signing rather than rendered on
// demand: this document carries two signatures and a legal declaration, so the
// bytes both parties saw must be the bytes that persist. Re-rendering it later
// from rows would quietly produce a different file every time the template
// changed.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ acceptanceId: string }> },
) {
  const { acceptanceId } = await params;
  if (!isUuid(acceptanceId)) return new NextResponse("Not found", { status: 404 });

  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person" || actor.role === "crew") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const db = createAdminClient();
  const { data: acceptance } = await db
    .from("acceptances")
    .select("id, project_id, report_pdf_path")
    .eq("id", acceptanceId)
    .maybeSingle();
  if (!acceptance?.report_pdf_path) return new NextResponse("Not found", { status: 404 });

  try {
    await requireProjectActor(actor, acceptance.project_id);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await db.storage.from("reports").download(acceptance.report_pdf_path);
  if (file.error || !file.data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(await file.data.arrayBuffer()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="abnahmeprotokoll.pdf"',
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
