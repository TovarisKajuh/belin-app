// Document strings, resolved in the PROJECT's language rather than the
// reader's.
//
// A naročilnica for a German site is a German document even when the person who
// pressed the button had the app in Slovenian: the document is evidence between
// two companies, and its language belongs to the job, not to the browser.
//
// @react-pdf components render outside React's tree and cannot call next-intl
// hooks, so the catalogs are read directly here and handed to the document as a
// plain object. Missing keys fall back to the key name rather than throwing: a
// document with one odd label still beats a failed generation on a roof.

import { lookupKey } from "@/lib/notify-shared";
import sl from "@/messages/sl.json";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import type { NarocilnicaStrings } from "@/lib/pdf/narocilnica";

export type DocLocale = "sl" | "de" | "en";

const CATALOGS: Record<DocLocale, unknown> = { sl, de, en };

export function docString(locale: DocLocale, key: string): string {
  return lookupKey(CATALOGS[locale], key) ?? lookupKey(CATALOGS.sl, key) ?? key;
}

export function poStrings(locale: DocLocale): NarocilnicaStrings {
  const t = (key: string) => docString(locale, key);
  return {
    title: t("po.title"),
    docNo: t("po.doc.docNo"),
    orderer: t("po.doc.orderer"),
    contractor: t("po.doc.contractor"),
    vatId: t("po.doc.vatId"),
    site: t("po.doc.site"),
    date: t("po.doc.date"),
    deadline: t("po.doc.deadline"),
    paymentTerms: t("po.doc.paymentTerms"),
    regieRate: t("po.doc.regieRate"),
    perHour: t("po.doc.perHour"),
    colDescription: t("po.doc.colDescription"),
    colQty: t("po.doc.colQty"),
    colUnitPrice: t("po.doc.colUnitPrice"),
    colTotal: t("po.doc.colTotal"),
    totalNet: t("po.doc.totalNet"),
    acceptanceTitle: t("po.doc.acceptanceTitle"),
    acceptanceBody: t("po.doc.acceptanceBody"),
    acceptedBy: t("po.doc.acceptedBy"),
    acceptedAt: t("po.doc.acceptedAt"),
    hashLabel: t("po.doc.hashLabel"),
    generated: t("po.doc.generated"),
  };
}
