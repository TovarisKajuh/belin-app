import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import { getSignedReportUrl } from "@/lib/storage";

// Serving a generated report. Person sessions only, crew never. After the gate
// the route redirects to a 60 second signed storage URL instead of streaming
// the bytes: a report with weeks of photographs can be larger than a function
// response may be. The URL is never written into a page.

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

  // REDIRECT, DO NOT STREAM (decision 2026-10-06). A report with weeks of
  // photographs can pass Vercel's 4.5 MB function response limit, and holding
  // it in the function's memory buys nothing. The gate above decided who may
  // read it; the signed URL lives 60 seconds and carries no Belin token. The
  // small documents keep streaming through their own routes.
  const url = await getSignedReportUrl(doc.storage_path, 60);
  if (!url) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
