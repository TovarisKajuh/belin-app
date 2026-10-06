// Rendering the naročilnica.
//
// Deliberately NOT "server-only", following the lib/k2 precedent: the demo
// seed renders these documents under plain Node through scripts/seed-documents.ts,
// where that import throws. It holds no secrets and reads no environment; the
// database client is handed in by the caller, who has already decided that the
// caller is allowed to read this project.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { NarocilnicaDocument } from "@/lib/pdf/narocilnica";
import { poStrings, type DocLocale } from "@/lib/pdf/strings";
import { renderDocument } from "@/lib/pdf/theme";
import { loadLogo } from "@/lib/pdf/issuer";

export function sha256Of(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function docLocale(language: string | null): DocLocale {
  return language === "de" || language === "en" ? language : "sl";
}
/**
 * Renders the document from the CURRENT database state. Exported because the
 * demo seed renders the same documents through this exact path, so a staged
 * naročilnica is a real one rather than a row pretending to be one.
 */
export async function renderPoPdf(
    // Any client the caller has already authorized. The seed passes the admin
  // client directly; the app passes its own.
  db: SupabaseClient<any, any, any>,
  projectId: string,
  poId: string,
  acceptance: { name: string; at: string } | null,
): Promise<{ buffer: Buffer; sha256: string }> {
  const { data: project } = await db
    .from("projects")
    .select(
      "id, name, language, country, address_street, address_zip, address_city, epc_org_id, sub_org_id",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!project) throw new Error("Project not found");

  const { data: po } = await db
    .from("purchase_orders")
    .select("id, number, total_net, regie_hourly_rate, payment_terms, deadline, created_at")
    .eq("id", poId)
    .maybeSingle();
  if (!po) throw new Error("Naročilnica not found");

  const { data: lines } = await db
    .from("purchase_order_lines")
    .select("description, qty, unit, unit_price, total, sort_order")
    .eq("purchase_order_id", poId)
    .order("sort_order", { ascending: true });

  const orgIds = [project.epc_org_id, project.sub_org_id].filter(Boolean) as string[];
  const { data: orgs } = await db
    .from("organizations")
    .select("id, name, address, vat_id, logo_path")
    .in("id", orgIds);

  const orgById = new Map((orgs ?? []).map((org) => [org.id, org]));
  const epc = orgById.get(project.epc_org_id);
  const sub = project.sub_org_id ? orgById.get(project.sub_org_id) : null;

  const locale = docLocale(project.language);
  const address = [project.address_street, [project.address_zip, project.address_city].filter(Boolean).join(" ")]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");

  const buffer = await renderDocument(
    NarocilnicaDocument({
      number: po.number,
      locale,
      projectName: project.name,
      siteAddress: address || null,
      issuedOn: formatDate(po.created_at, locale),
      deadline: po.deadline ? formatDate(po.deadline, locale) : null,
      paymentTerms: po.payment_terms,
      regieHourlyRate: po.regie_hourly_rate === null ? null : Number(po.regie_hourly_rate),
      totalNet: Number(po.total_net),
      lines: (lines ?? []).map((line) => ({
        description: line.description,
        qty: line.qty === null ? null : Number(line.qty),
        unit: line.unit,
        unitPrice: line.unit_price === null ? null : Number(line.unit_price),
        total: Number(line.total),
      })),
      epcOrg: {
        name: epc?.name ?? "",
        address: epc?.address ?? null,
        vatId: epc?.vat_id ?? null,
      },
      subOrg: {
        name: sub?.name ?? "",
        address: sub?.address ?? null,
        vatId: sub?.vat_id ?? null,
      },
      acceptance,
      issuer: { name: epc?.name ?? "", address: epc?.address ?? null, logo: await loadLogo(db, epc?.logo_path) },
      s: poStrings(locale, project.country),
    }),
  );

  return { buffer, sha256: sha256Of(buffer) };
}

function formatDate(value: string, locale: DocLocale): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
