import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";
import { isUuid } from "@/lib/actor-shared";
import { requireOfficeActor, requireProjectActor, type Actor } from "@/lib/actor";
import { emitEventDeferred } from "@/lib/notify";
import { sendEmail, renderEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";
import { storeReportPdf } from "@/lib/storage";
import { formatMoney } from "@/lib/po-shared";
import { approvedHours } from "@/lib/data/hours";
import { approvedChangeOrders } from "@/lib/data/change-orders";
import {
  composeInvoiceLines,
  computeTotals,
  defaultVatMode,
  nextInvoiceNumber,
  reverseChargeNote,
  standardVatRate,
  type Country,
  type VatMode,
} from "@/lib/invoice-shared";
import { InvoiceDocument } from "@/lib/pdf/invoice";
import { invoiceStrings, docString, type DocLocale } from "@/lib/pdf/strings";
import { renderDocument } from "@/lib/pdf/theme";
import { loadIssuer } from "@/lib/pdf/issuer";
import type { InvoiceView } from "@/lib/invoice-view";

export type { InvoiceView, InvoiceWarning } from "@/lib/invoice-view";

// Generating the invoice, and sending it where it actually needs to go.
//
// The invoice is composed from things that were already agreed: the accepted
// naročilnica, the hours the client approved (including the ones approved by
// silence), and the extras they approved. Nothing here invents a price.
//
// It is generated ONCE. The database enforces one invoice per project, because
// generating twice mints two legal documents for the same work and the second
// one is always an accident.

const COUNTRIES: Country[] = ["si", "de", "at"];

function countryOf(value: string | null): Country {
  return COUNTRIES.includes(value as Country) ? (value as Country) : "si";
}

function localeOf(value: string | null): DocLocale {
  return value === "de" || value === "en" ? value : "sl";
}

export async function getInvoice(actor: Actor, projectId: string): Promise<InvoiceView | null> {
  await requireProjectActor(actor, projectId);

  const { data } = await createAdminClient()
    .from("invoices")
    .select(
      "id, number, issue_date, total_net, total_vat, total_gross, vat_mode, accountant_email, sent_to_accountant_at, pdf_path",
    )
    .eq("project_id", projectId)
    .maybeSingle();
  if (!data) return null;

  return {
    id: data.id,
    number: data.number,
    issueDate: data.issue_date,
    totalNet: Number(data.total_net),
    totalVat: data.total_vat === null ? null : Number(data.total_vat),
    totalGross: Number(data.total_gross),
    vatMode: data.vat_mode as VatMode,
    accountantEmail: data.accountant_email,
    sentToAccountantAt: data.sent_to_accountant_at,
    hasPdf: Boolean(data.pdf_path),
  };
}

export interface GenerateResult {
  invoiceId: string;
  warnings: string[];
}

export async function generateInvoice(actor: Actor, projectId: string): Promise<GenerateResult> {
  const projectActor = await requireProjectActor(actor, projectId);
  const person = requireOfficeActor(actor);
  if (projectActor.role !== "sub") {
    // The subcontractor invoices the EPC. An EPC generating their own incoming
    // invoice would be writing the other side's document.
    throw new Error("invoice.errSubOnly");
  }

  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select(
      "id, name, language, country, vat_mode, address_street, address_zip, address_city, epc_org_id, sub_org_id",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!project?.sub_org_id) throw new Error("invoice.errNoSub");

  const existing = await getInvoice(actor, projectId);
  if (existing) throw new Error("invoice.exists");

  const country = countryOf(project.country);
  const locale = localeOf(project.language);
  // A project seeded or created before vat_mode existed falls back to the rule
  // rather than to nothing.
  const vatMode = (project.vat_mode as VatMode | null) ?? defaultVatMode(country);

  const { data: orgs } = await db
    .from("organizations")
    .select("id, name, address, vat_id, iban")
    .in("id", [project.epc_org_id, project.sub_org_id]);

  const supplier = orgs?.find((org) => org.id === project.sub_org_id);
  const customer = orgs?.find((org) => org.id === project.epc_org_id);

  // Under reverse charge BOTH VAT ids are mandatory on the document: the
  // customer's is what proves the tax shifts to them.
  if (vatMode === "reverse_charge" && (!supplier?.vat_id || !customer?.vat_id)) {
    throw new Error("invoice.errNoVatId");
  }

  const { data: po } = await db
    .from("purchase_orders")
    .select("total_net, regie_hourly_rate, status")
    .eq("project_id", projectId)
    .eq("status", "accepted")
    .maybeSingle();

  const composed = composeInvoiceLines({
    po: po
      ? {
          totalNet: Number(po.total_net),
          regieHourlyRate: po.regie_hourly_rate === null ? null : Number(po.regie_hourly_rate),
          label: `${docString(locale, "invoice.doc.workLabel")} ${project.name}`,
        }
      : null,
    // persistDeemed runs inside approvedHours, so hours the clock approved
    // while nobody was looking are billed rather than silently dropped.
    approvedRegieHours: await approvedHours(projectId),
    approvedChangeOrders: await approvedChangeOrders(projectId),
  });

  if (composed.lines.length === 0) throw new Error("invoice.errEmpty");

  const rate = vatMode === "standard" ? standardVatRate(country) : null;
  const totals = computeTotals(composed.totalNet, vatMode, rate);

  const { data: numbers } = await db
    .from("invoices")
    .select("number")
    .eq("sub_org_id", project.sub_org_id);

  const issueDate = new Date().toISOString().slice(0, 10);
  const year = Number(issueDate.slice(0, 4));

  let invoiceId: string | null = null;
  for (let attempt = 0; attempt < 2 && !invoiceId; attempt++) {
    const number = nextInvoiceNumber(year, (numbers ?? []).map((row) => row.number));

    const { data, error } = await db
      .from("invoices")
      .insert({
        project_id: projectId,
        sub_org_id: project.sub_org_id,
        number,
        status: "final",
        issue_date: issueDate,
        vat_mode: vatMode,
        vat_rate: rate,
        total_vat: totals.totalVat,
        reverse_charge_note: vatMode === "reverse_charge" ? reverseChargeNote(country) : null,
        // Snapshots, not joins: this document must keep saying what it said.
        supplier: ({
          name: supplier?.name ?? "",
          address: supplier?.address ?? null,
          vatId: supplier?.vat_id ?? null,
        } as unknown) as Json,
        customer: ({
          name: customer?.name ?? "",
          address: customer?.address ?? null,
          vatId: customer?.vat_id ?? null,
        } as unknown) as Json,
        // The interface shapes are plain data; the cast is only about our Json
        // type lacking an index signature, the same pattern the wizard uses.
        lines: composed.lines as unknown as Json,
        total_net: composed.totalNet,
        total_gross: totals.totalGross,
        iban: supplier?.iban ?? null,
        created_by_person: person.personId,
      })
      .select("id")
      .maybeSingle();

    // 23505 on (sub_org_id, number) means somebody else took the number in the
    // same instant; the single-invoice index means the project already has one.
    if (error?.code === "23505") {
      const again = await getInvoice(actor, projectId);
      if (again) throw new Error("invoice.exists");
      continue;
    }
    if (error || !data) throw new Error("Could not create the invoice");
    invoiceId = data.id;
  }
  if (!invoiceId) throw new Error("Could not create the invoice");

  // The PDF is rendered and stored AT GENERATION, so download and share always
  // have bytes to work with rather than a row promising a document.
  const path = await renderAndStore(projectId, invoiceId);
  await db.from("invoices").update({ pdf_path: path }).eq("id", invoiceId);

  await db.from("activity").insert({
    project_id: projectId,
    kind: "invoice_generated",
    payload: { number: (await getInvoice(actor, projectId))?.number ?? "" },
    actor_person: person.personId,
  });

  return { invoiceId, warnings: composed.warnings };
}

async function renderAndStore(projectId: string, invoiceId: string): Promise<string> {
  const db = createAdminClient();

  const { data: invoice } = await db
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  const { data: project } = await db
    .from("projects")
    .select("name, language, address_street, address_zip, address_city")
    .eq("id", projectId)
    .maybeSingle();
  if (!invoice || !project) throw new Error("Invoice not found");

  const locale = localeOf(project.language);
  const money = (value: number) => formatMoney(value, locale);
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const supplier = invoice.supplier as { name: string; address: string | null; vatId: string | null };
  const customer = invoice.customer as { name: string; address: string | null; vatId: string | null };
  const lines = invoice.lines as {
    kind: string;
    description: string;
    qty: number | null;
    unitPrice: number | null;
    total: number;
  }[];

  const buffer = await renderDocument(
    InvoiceDocument({
      number: invoice.number,
      issueDate: dateFmt.format(new Date(`${invoice.issue_date}T12:00:00Z`)),
      dueDate: invoice.due_date ? dateFmt.format(new Date(`${invoice.due_date}T12:00:00Z`)) : null,
      servicePeriod: null,
      siteAddress:
        [project.address_street, [project.address_zip, project.address_city].filter(Boolean).join(" ")]
          .filter((part) => part && part.trim())
          .join(", ") || null,
      supplier,
      customer,
      iban: invoice.iban,
      lines: lines.map((line) => ({
        description:
          line.kind === "regie"
            ? `${docString(locale, "invoice.doc.regieLine")} ${line.description}`
            : line.description,
        qty: line.qty === null ? null : String(line.qty),
        unitPrice: line.unitPrice === null ? null : money(line.unitPrice),
        total: money(line.total),
      })),
      totalNet: money(Number(invoice.total_net)),
      vatMode: invoice.vat_mode as VatMode,
      vatRateLabel: invoice.vat_rate === null ? null : `${Number(invoice.vat_rate)} %`,
      totalVat: invoice.total_vat === null ? null : money(Number(invoice.total_vat)),
      totalGross: money(Number(invoice.total_gross)),
      reverseChargeNote: invoice.reverse_charge_note,
      // The supplier issues its own invoice: the name and address are the
      // snapshot printed in the parties block, the logo is the company's current one.
      issuer: { name: supplier.name, address: supplier.address, logo: (await loadIssuer(db, invoice.sub_org_id)).logo },
      s: invoiceStrings(locale),
    }),
  );

  return storeReportPdf(`${projectId}/invoice/${invoiceId}.pdf`, buffer);
}

/**
 * Sends the invoice to the subcontractor's own accountant, as an ATTACHMENT.
 *
 * An accountant who has to follow a link, create an account and download a file
 * is an accountant who asks for it by email instead, and then the document
 * everybody works from is a copy nobody can trace.
 */
export async function shareToAccountant(
  actor: Actor,
  projectId: string,
  invoiceId: string,
): Promise<void> {
  const projectActor = await requireProjectActor(actor, projectId);
  const person = requireOfficeActor(actor);
  if (projectActor.role !== "sub") throw new Error("invoice.errSubOnly");
  if (!isUuid(invoiceId)) throw new Error("Invalid invoice id");

  const db = createAdminClient();

  const { data: org } = await db
    .from("organizations")
    .select("accountant_email, name")
    .eq("id", person.orgId)
    .maybeSingle();

  const to = org?.accountant_email?.trim();
  if (!to) throw new Error("invoice.errNoAccountant");

  const { data: invoice } = await db
    .from("invoices")
    .select("id, number, pdf_path, project_id")
    .eq("id", invoiceId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!invoice?.pdf_path) throw new Error("invoice.errNoPdf");

  const file = await db.storage.from("reports").download(invoice.pdf_path);
  if (file.error || !file.data) throw new Error("invoice.errNoPdf");
  const bytes = Buffer.from(await file.data.arrayBuffer());

  // One conditional update: a second click cannot send the same invoice twice.
  const { data: marked } = await db
    .from("invoices")
    .update({ sent_to_accountant_at: new Date().toISOString(), accountant_email: to })
    .eq("id", invoiceId)
    .is("sent_to_accountant_at", null)
    .select("id")
    .maybeSingle();
  if (!marked) throw new Error("invoice.alreadyShared");

  const { data: project } = await db
    .from("projects")
    .select("name, language")
    .eq("id", projectId)
    .maybeSingle();

  const locale = localeOf(project?.language ?? null);
  const subject = `${docString(locale, "invoice.mailSubject")} ${invoice.number}`;
  const html = renderEmail(
    subject,
    [`${docString(locale, "invoice.mailBody")} ${project?.name ?? ""}`],
    docString(locale, "notify.cta"),
    `${appBaseUrl() ?? "https://getbelin.com"}/${locale}/app/${projectId}/final`,
  );

  await sendEmail({
    to,
    kind: "invoice-accountant",
    projectId,
    subject,
    html,
    attachments: [{ filename: `${invoice.number}.pdf`, content: bytes }],
  });

  await emitEventDeferred({
    projectId,
    kind: "invoice_sent",
    actorPerson: person.personId,
    payload: { number: invoice.number, email: to },
  });
}
