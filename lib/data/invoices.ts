import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";
import { isUuid } from "@/lib/actor-shared";
import { requireOfficeActor, requireProjectActor, type Actor } from "@/lib/actor";
import { emitEventDeferred } from "@/lib/notify";
import { formatTemplate } from "@/lib/notify-shared";
import { projectToday, projectZone } from "@/lib/project-time";
import { fmtDate, fmtNumber } from "@/lib/format";
import { sendEmail, renderEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";
import { storeReportPdf } from "@/lib/storage";
import { formatMoney } from "@/lib/po-shared";
import { approvedHours } from "@/lib/data/hours";
import { approvedChangeOrders } from "@/lib/data/change-orders";
import {
  addDaysIso,
  composeInvoiceLines,
  computeTotals,
  defaultVatMode,
  nextInvoiceNumber,
  paymentDays,
  reverseChargeNote,
  servicePeriod,
  standardVatRate,
  type Country,
  type InvoiceLine,
  type VatMode,
} from "@/lib/invoice-shared";
import { InvoiceDocument, type InvoiceInput, type InvoiceParty } from "@/lib/pdf/invoice";
import { invoiceStrings, docString, type DocLocale } from "@/lib/pdf/strings";
import { renderDocument, type DocIssuer } from "@/lib/pdf/theme";
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

/** Everything the invoice row and its PDF say, assembled once, in memory. */
interface InvoiceSnapshot {
  id: string;
  number: string;
  /** yyyy-mm-dd at the site, like every date below. */
  issueDate: string;
  dueDate: string;
  serviceStart: string;
  serviceEnd: string;
  vatMode: VatMode;
  vatRate: number | null;
  totalVat: number | null;
  totalNet: number;
  totalGross: number;
  reverseChargeNote: string | null;
  supplier: InvoiceParty;
  customer: InvoiceParty;
  iban: string | null;
  lines: InvoiceLine[];
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
  if (await getInvoice(actor, projectId)) throw new Error("invoice.exists");

  const country = countryOf(project.country);
  const locale = localeOf(project.language);
  const zone = projectZone(project.country);
  // A project seeded or created before vat_mode existed falls back to the rule
  // rather than to nothing.
  const vatMode = (project.vat_mode as VatMode | null) ?? defaultVatMode(country);

  const { data: orgs } = await db
    .from("organizations")
    .select("id, name, address, vat_id, iban")
    .in("id", [project.epc_org_id, project.sub_org_id]);
  const supplier = orgs?.find((org) => org.id === project.sub_org_id);
  const customer = orgs?.find((org) => org.id === project.epc_org_id);
  if (!supplier || !customer) throw new Error("invoice.errNoSub");

  // Under reverse charge BOTH VAT ids are mandatory on the document: the
  // customer's is what proves the tax shifts to them.
  if (vatMode === "reverse_charge" && (!supplier.vat_id || !customer.vat_id)) {
    throw new Error("invoice.errNoVatId");
  }
  // Full name AND address of both parties (§ 14 Abs. 4 Nr. 1 UStG, 82. člen
  // ZDDV-1). Refused here, where settings can still fix it, rather than
  // printed incomplete on a numbered document that can never change.
  if (!supplier.address?.trim() || !customer.address?.trim()) throw new Error("invoice.errNoAddress");

  // The supply is complete when the client accepted it. No invoice before
  // that, and the acceptance day ends the service period.
  const { data: acceptance } = await db
    .from("acceptances")
    .select("conducted_at")
    .eq("project_id", projectId)
    .eq("kind", "final")
    .eq("status", "signed")
    .neq("declaration", "refused")
    .order("conducted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!acceptance?.conducted_at) throw new Error("invoice.errNoAcceptance");

  const { data: po } = await db
    .from("purchase_orders")
    .select("number, sent_at, total_net, regie_hourly_rate, payment_terms")
    .eq("project_id", projectId)
    .eq("status", "accepted")
    .maybeSingle();

  const { data: firstEntry } = await db
    .from("daily_entries")
    .select("entry_date")
    .eq("project_id", projectId)
    .order("entry_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const issueDate = projectToday(project.country);
  const period = servicePeriod({
    firstEntry: firstEntry?.entry_date ?? null,
    acceptanceDay: projectToday(project.country, new Date(acceptance.conducted_at)),
  });
  const dueDate = addDaysIso(issueDate, paymentDays(po?.payment_terms ?? null));

  // The main line names the order it bills, by number and date.
  const workLabel = `${docString(locale, "invoice.doc.workLabel")} ${project.name}`;
  const poLabel = po
    ? `${workLabel}, ${formatTemplate(docString(locale, "invoice.doc.poRef"), {
        number: String(po.number),
        date: po.sent_at ? fmtDate(po.sent_at, locale, { timeZone: zone }) : "",
      })}`
    : workLabel;

  const composed = composeInvoiceLines({
    po: po
      ? {
          totalNet: Number(po.total_net),
          regieHourlyRate: po.regie_hourly_rate === null ? null : Number(po.regie_hourly_rate),
          label: poLabel,
        }
      : null,
    // persistDeemed runs inside approvedHours, so hours the clock approved
    // while nobody was looking are billed rather than silently dropped.
    approvedRegieHours: await approvedHours(projectId),
    approvedChangeOrders: (await approvedChangeOrders(projectId)).map((order) => ({
      ...order,
      label: formatTemplate(docString(locale, "invoice.doc.coLine"), {
        number: String(order.number),
        title: order.title,
      }),
    })),
  });
  if (composed.lines.length === 0) throw new Error("invoice.errEmpty");

  const rate = vatMode === "standard" ? standardVatRate(country) : null;
  const totals = computeTotals(composed.totalNet, vatMode, rate);
  const siteAddress =
    [project.address_street, [project.address_zip, project.address_city].filter(Boolean).join(" ")]
      .filter((part) => part && part.trim())
      .join(", ") || null;
  const year = Number(issueDate.slice(0, 4));
  // The supplier issues its own invoice (Task 6.1m, D16): the name and address
  // printed top right are the snapshot below, the logo is the company's current one.
  const issuerLogo = (await loadIssuer(db, project.sub_org_id)).logo;

  let created: InvoiceSnapshot | null = null;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    // Re-read every attempt: after a collision the next number must account
    // for the one the other request just took.
    const { data: numbers } = await db
      .from("invoices")
      .select("number")
      .eq("sub_org_id", project.sub_org_id);

    const snapshot: InvoiceSnapshot = {
      id: randomUUID(),
      number: nextInvoiceNumber(year, (numbers ?? []).map((row) => row.number)),
      issueDate,
      dueDate,
      serviceStart: period.start,
      serviceEnd: period.end,
      vatMode,
      vatRate: rate,
      totalVat: totals.totalVat,
      totalNet: composed.totalNet,
      totalGross: totals.totalGross,
      reverseChargeNote: vatMode === "reverse_charge" ? reverseChargeNote(country) : null,
      // Snapshots, not joins: this document must keep saying what it said.
      supplier: { name: supplier.name, address: supplier.address, vatId: supplier.vat_id },
      customer: { name: customer.name, address: customer.address, vatId: customer.vat_id },
      iban: supplier.iban ?? null,
      lines: composed.lines,
    };

    // THE DOCUMENT FIRST, THEN THE ROW (flows M1). A numbered invoice with no
    // file behind it was a legal record nobody could open, and a retry then
    // stopped on "invoice.exists". The path carries the new row's id, so it
    // is written once (docs/known-issues.md entry 2).
    const buffer = await renderDocument(
      InvoiceDocument(
        documentInput(snapshot, {
          siteAddress,
          locale,
          zone,
          issuer: { name: supplier.name, address: supplier.address, logo: issuerLogo },
        }),
      ),
    );
    const path = await storeReportPdf(`${projectId}/invoice/${snapshot.id}.pdf`, buffer);

    const { error } = await db.from("invoices").insert({
      id: snapshot.id,
      project_id: projectId,
      sub_org_id: project.sub_org_id,
      number: snapshot.number,
      status: "final",
      issue_date: snapshot.issueDate,
      due_date: snapshot.dueDate,
      service_start: snapshot.serviceStart,
      service_end: snapshot.serviceEnd,
      vat_mode: vatMode,
      vat_rate: rate,
      total_vat: totals.totalVat,
      reverse_charge_note: snapshot.reverseChargeNote,
      // The interface shapes are plain data; the cast is only about our Json
      // type lacking an index signature, the same pattern the wizard uses.
      supplier: snapshot.supplier as unknown as Json,
      customer: snapshot.customer as unknown as Json,
      lines: composed.lines as unknown as Json,
      total_net: composed.totalNet,
      total_gross: totals.totalGross,
      iban: snapshot.iban,
      pdf_path: path,
      created_by_person: person.personId,
    });

    if (!error) {
      created = snapshot;
      break;
    }
    // 23505 on (sub_org_id, number): somebody took the number in the same
    // instant; on the single-invoice index: the project already has one. The
    // file stored under this attempt's id stays unreferenced, which is harmless.
    if (error.code === "23505") {
      if (await getInvoice(actor, projectId)) throw new Error("invoice.exists");
      continue;
    }
    throw new Error("Could not create the invoice");
  }
  if (!created) throw new Error("Could not create the invoice");

  await db.from("activity").insert({
    project_id: projectId,
    kind: "invoice_generated",
    payload: { number: created.number },
    actor_person: person.personId,
  });

  return { invoiceId: created.id, warnings: composed.warnings };
}

/** The snapshot as the document prints it, in the project's language and zone. */
function documentInput(
  snapshot: InvoiceSnapshot,
  context: { siteAddress: string | null; locale: DocLocale; zone: string; issuer: DocIssuer },
): InvoiceInput {
  const { locale, zone } = context;
  const money = (value: number) => formatMoney(value, locale);
  const day = (iso: string) => fmtDate(iso, locale, { timeZone: zone });

  return {
    number: snapshot.number,
    issueDate: day(snapshot.issueDate),
    dueDate: day(snapshot.dueDate),
    servicePeriod: `${day(snapshot.serviceStart)} - ${day(snapshot.serviceEnd)}`,
    siteAddress: context.siteAddress,
    supplier: snapshot.supplier,
    customer: snapshot.customer,
    iban: snapshot.iban,
    lines: snapshot.lines.map((line) => ({
      description:
        line.kind === "regie"
          ? `${docString(locale, "invoice.doc.regieLine")} ${line.description}`
          : line.description,
      qty: line.qty === null ? null : `${fmtNumber(line.qty, locale)}${line.unit ? ` ${line.unit}` : ""}`,
      unitPrice: line.unitPrice === null ? null : money(line.unitPrice),
      total: money(line.total),
    })),
    totalNet: money(snapshot.totalNet),
    vatMode: snapshot.vatMode,
    vatRateLabel: snapshot.vatRate === null ? null : `${fmtNumber(snapshot.vatRate, locale)} %`,
    totalVat: snapshot.totalVat === null ? null : money(snapshot.totalVat),
    totalGross: money(snapshot.totalGross),
    reverseChargeNote: snapshot.reverseChargeNote,
    issuer: context.issuer,
    s: invoiceStrings(locale),
  };
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
