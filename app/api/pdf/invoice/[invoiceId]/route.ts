import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveActorFromSession } from "@/lib/auth";
import { requireOfficeActor, requireProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";

// The invoice, the one document restricted to the OFFICE on both sides.
//
// A Bauleiter needs the day reports and the acceptance; they have no business
// with what the subcontractor charges, and neither does anybody holding a
// project link. Admin and owner only.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  if (!isUuid(invoiceId)) return new NextResponse("Not found", { status: 404 });

  const actor = await resolveActorFromSession();
  if (!actor) return new NextResponse("Forbidden", { status: 403 });

  try {
    requireOfficeActor(actor);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const db = createAdminClient();
  const { data: invoice } = await db
    .from("invoices")
    .select("id, project_id, number, pdf_path")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice?.pdf_path) return new NextResponse("Not found", { status: 404 });

  try {
    await requireProjectActor(actor, invoice.project_id);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await db.storage.from("reports").download(invoice.pdf_path);
  if (file.error || !file.data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(await file.data.arrayBuffer()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
