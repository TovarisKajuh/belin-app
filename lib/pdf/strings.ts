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
import type { RegieberichtStrings } from "@/lib/pdf/regiebericht";
import type { CompletionStrings } from "@/lib/pdf/completion";

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

export function regieStrings(locale: DocLocale): RegieberichtStrings {
  const t = (key: string) => docString(locale, key);
  return {
    title: t("hours.doc.title"),
    docNo: t("hours.doc.docNo"),
    project: t("hours.doc.project"),
    contractor: t("hours.doc.contractor"),
    submitted: t("hours.doc.submitted"),
    status: t("hours.doc.status"),
    decidedBy: t("hours.doc.decidedBy"),
    colDate: t("hours.doc.colDate"),
    colPerson: t("hours.doc.colPerson"),
    colHours: t("hours.doc.colHours"),
    colDescription: t("hours.doc.colDescription"),
    totalHours: t("hours.doc.totalHours"),
    hoursUnit: t("hours.doc.hoursUnit"),
    deemedNote: t("hours.doc.deemedNote"),
    generated: t("hours.doc.generated"),
  };
}

/** Status labels for documents, resolved in the project's language. */
export function sheetStatusLabel(locale: DocLocale, status: string): string {
  return docString(locale, `hours.status.${status}`);
}

export function completionStrings(locale: DocLocale): CompletionStrings {
  const t = (key: string) => docString(locale, key);
  return {
    title: t("final.doc.title"),
    project: t("final.doc.project"),
    client: t("final.doc.client"),
    contractor: t("final.doc.contractor"),
    site: t("final.doc.site"),
    period: t("final.doc.period"),
    power: t("final.doc.power"),
    days: t("final.doc.days"),
    totalHours: t("final.doc.totalHours"),
    registers: t("final.doc.registers"),
    hoursRegister: t("final.doc.hoursRegister"),
    coRegister: t("final.doc.coRegister"),
    incidentRegister: t("final.doc.incidentRegister"),
    colNo: t("final.doc.colNo"),
    colHours: t("final.doc.colHours"),
    colStatus: t("final.doc.colStatus"),
    colTitle: t("final.doc.colTitle"),
    colAmount: t("final.doc.colAmount"),
    colDate: t("final.doc.colDate"),
    colKind: t("final.doc.colKind"),
    colNote: t("final.doc.colNote"),
    none: t("final.doc.none"),
    generated: t("final.doc.generated"),
    day: {
      // Overwritten by the caller with the site-appropriate diary title.
      title: t("final.diaryTitleSi"),
      reportNo: t("final.dayDoc.reportNo"),
      date: t("final.dayDoc.date"),
      weather: t("final.dayDoc.weather"),
      headcount: t("final.dayDoc.headcount"),
      work: t("final.dayDoc.work"),
      quantities: t("final.dayDoc.quantities"),
      incidents: t("final.dayDoc.incidents"),
      photos: t("final.dayDoc.photos"),
      author: t("final.dayDoc.author"),
      signature: t("final.dayDoc.signature"),
      noWeather: t("final.dayDoc.noWeather"),
      people: t("final.dayDoc.people"),
      generated: t("final.dayDoc.generated"),
    },
  };
}
