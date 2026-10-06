# Recon: i18n-copy (language, copy, terminology), 2026-10-05

Scratch folder: `scratchpad/recon/i18n-copy/` (shots.mjs, keys.mjs, pdftext.mjs, q.mjs, screenshots *.png, page text *.txt).

## Current state

- Catalogs: sl, de, en each 834 keys, identical key sets. `tests/messages-parity.test.ts` (parity, no Slovenian leftovers, no empties) and `tests/messages-icu.test.ts` (ICU compiles, same args, no em/en dash) both pass (ran `npx vitest run` on the two files, 8/8 green). There are NO Slovenian placeholders left in de/en.
- Dashes: zero U+2013/U+2014 in app/, components/, lib/, messages/, public/ (grep on raw bytes). Only `scripts/marketing/vloga.mjs:84,90` (the text "M", an en dash, "mešani": quoted operator form wording). The dash test only covers messages/*.json, not legal-copy.ts, brochure-copy.ts, components or PDFs.
- Hardcoded strings bypassing t(): rare. The real ones: PO default line "Montaža FV sistema" (po/page.tsx:55), unit "kos" defaults (PoBuilder.tsx:27, Wizard.tsx:480, lib/k2/k2-project.ts:179,239, DB default in create_project_from_review), DevSwapBar English labels (DevSwapBar.tsx:18,27), LegalPage aria-label "Language" (LegalPage.tsx:40), Next default 404 page (English, unbranded). Legal pages, share metadata and brochure copy are deliberately in TS files, per language.
- Formatting is the weak spot: kWp, percent and tempo values are printed as raw JS numbers (dot decimal) in sl and de UI and in PDFs; ddmm() prints "DD.MM" for every locale; vault prints ISO dates.
- Documents follow the project language correctly: lib/pdf/strings.ts resolves every PDF label from the project's `language`, all five documents and the e-mail notifications (lib/notify.ts:109) use it, the diary title follows the site country (lib/report-days-shared.ts:44).
- Language switch: present on landing, login, legal, projects, settings, wizard and every CommandBar screen (crew too). Missing on invite, magic-link verify, crew claim, crew project picker and 404.
- German: competent, Sie-form consistent (no du/dein anywhere), but about 25 strings read translated or use the wrong trade word, and it is German-German (VOB/B, Abnahme, Vertragsstrafe) while the likely prospect is Austrian (Salzburg deck, docs/sessions/2026-09-16-salzburg-epc-presentation.md).
- Slovenian: native and good; a grammar slip, a wrong term (Nadgradnje), the account/invoice ambiguity of "račun", inconsistent status words.
- English: serviceable, some Germanisms ("Acceptance protocol", "Hourly work"), first-person app voice in the wizard.

## Blocker found outside the surface (must be first in the plan)

Supabase project xrwncpngjajosstvkign is PAUSED: get_project returns `"status":"INACTIVE"`; `nslookup xrwncpngjajosstvkign.supabase.co` = Non-existent domain; execute_sql times out; `http://localhost:3000/sl/p/demo-sub-r8p3n6w1` returns 404 after 7.5 s and `https://belin-app.vercel.app/sl/p/demo-sub-r8p3n6w1` returns 404. Every signed-in screen and every document is down, in production too, and the crew link shows "Link ungültig, Dieser Projektlink existiert nicht oder wurde widerrufen" (screenshot crewlink-de.png). Because of this no signed-in screen could be re-shot today; UI evidence below uses the German marketing screenshots of 31.08 (assets/marketing/raw-de, docs-de). `git log --since=2026-08-30 -- components app messages lib/pdf lib/data` shows only legal and marketing commits since, so those shots are the current UI.

## Findings (ranked for tomorrow's meeting)

See StructuredOutput for full list; the key text proposals are tabled here.

### German term and wording table (de.json)

| key | current | proposed |
|---|---|---|
| landing.title | Ihr Projekt an einem Ort: von der Übergabe über die Ausführung bis zum Abschluss. | Ihr Projekt an einem Ort: von der Auftragsvergabe über die Montage bis zur Abnahme. |
| landing.point2 | Der EPC sieht den Fortschritt live, ohne Anrufe und Tabellen. | Sie sehen den Fortschritt live, ohne Anrufe und Tabellen. |
| landing.truth3Body | ... Dann, wenn es noch billig ist. | ... Solange es noch wenig kostet. |
| landing.ctaButton | Anmelden | Pilotprojekt anfragen (mailto), Anmelden as secondary |
| landing.compliance2 | Reverse Charge auf der Rechnung, ohne manuelles Nachbessern. | Steuerschuldumkehr (Reverse Charge) auf der Rechnung, ohne Nacharbeit. |
| crew.material.title | Materialprüfung | Materialeingang |
| notify.pref.material_check_completed | Materialprüfung | Materialeingang geprüft |
| notify.subject.material_check_completed | Materialprüfung mit Fehlmengen: {project} | Fehlmengen beim Materialeingang: {project} |
| crew.material.unresolved | Bitte bewerten Sie alle Positionen. | Bitte markieren Sie alle Positionen. |
| sub.materialOk | Alle Positionen wurden übernommen. | Alle Positionen wurden vollständig geliefert. |
| sub.materialMissing | Das Team hat bei der Übernahme Fehlmengen erfasst. | Das Team hat bei der Anlieferung Fehlmengen erfasst. |
| dashboard.buffer | {# Tag/Tage Puffer} | {# Werktag/Werktage Puffer} (same as projects.scheduleAhead) |
| dashboard.behind | {# Tag/Tage Verzug} | {# Werktag/Werktage Verzug} |
| status.cancelled vs projects.status.cancelled | Abgebrochen / Storniert | Storniert in both |
| status.action.requestReview | Fertig, Prüfung anfordern | Fertigstellung melden |
| dashboard.requestsReview | {sub} bittet um Prüfung. | {sub} meldet die Fertigstellung und bittet um Abnahme. |
| notify.pref.finalization_requested | Antrag auf Abschluss | Fertigstellungsmeldung |
| notify.body.finalization_requested | Der Nachunternehmer hat den Abschluss des Projekts beantragt. | Der Nachunternehmer meldet die Fertigstellung und bittet um Abnahme. |
| final.request | Projekt abschließen | Fertigstellung melden |
| hours.status.submitted, co.status.submitted | In Entscheidung | Offen |
| hours.doc.title | Bericht über Regiestunden | Regiebericht |
| final.doc.sheetsCount | Regiestundenblätter | Stundenzettel |
| final.doc.incidents, final.doc.incidentsCount | Vorfälle | Vorkommnisse |
| final.doc.crew | Mannschaft | Arbeitskräfte |
| final.dayDoc.headcount | Anzahl der Arbeiter | Arbeitskräfte |
| final.agreed / final.disputed | Einvernehmlich / Strittig | Anerkannt / Bestritten |
| invoice.doc.reverseChargeTitle | Steuerklausel | Hinweis zur Steuerschuldnerschaft |
| invoice.doc.totalGross | Zahlbetrag | Rechnungsbetrag |
| po.doc.hashLabel | Fingerabdruck des Dokuments (SHA-256) | Prüfsumme des Dokuments (SHA-256) |
| po.acceptNote | ... dem Fingerabdruck des Dokuments ... | ... der Prüfsumme des Dokuments ... |
| po.askOfficeToAccept | Die Bestellung nimmt die Unternehmensleitung in ihrem eigenen Konto an. | Die Bestellung kann nur die Geschäftsleitung in ihrem eigenen Zugang annehmen. |
| final.askOffice | Diese Aktion führt die Unternehmensleitung in ihrem eigenen Konto aus. | Diese Aktion ist der Geschäftsleitung in ihrem eigenen Zugang vorbehalten. |
| request.cta | Anfordern | Anfrage |
| request.types.plan | Planung oder Dokument | Plan oder Unterlage |
| projects.scheduleOnTime | Genau im Termin | Im Zeitplan |
| wizard.warnNotK2 | Diese Datei erkenne ich nicht als K2-Bericht. ... | Diese Datei wurde nicht als K2-Bericht erkannt. Sie können die Daten von Hand eingeben. |
| wizard.warnMeta | Ich habe nicht alle Projektdaten aus der Planung gelesen. ... | Nicht alle Projektdaten konnten aus der Planung gelesen werden. Bitte ergänzen Sie sie unten. |
| wizard.badType | Ich nehme nur einen K2-Bericht als PDF an. | Unterstützt wird nur ein K2-Bericht im PDF-Format. |
| claim.subtitle | Einmal anmelden. Das Telefon merkt sich Sie, und beim nächsten Mal öffnet sich die App von selbst. | Einmal anmelden. Ihr Handy bleibt angemeldet, beim nächsten Mal öffnet sich die App direkt. |
| claim.installBody | Ein Wisch, und sie ist offen. Kein Suchen nach dem Link. | Ein Fingertipp, und Belin ist offen. Kein Suchen nach dem Link. |
| settings.crewEnable | Zurückholen | Wieder aktivieren |
| settings.crewRosterNote | ... mit einer Berührung an ... | ... mit einem Fingertipp an ... |
| settings.crewAddError, claim.errEmail, claim.errName | Bitte ... eingeben. | Bitte geben Sie ... ein. (one imperative style) |

Austria overlay (project.country = "at", documents and the hours/acceptance screens): Abnahmeprotokoll -> Übernahmeprotokoll, Abnahme -> Übernahme, Endabnahme -> Übernahme (förmlich), Vertragsstrafe -> Pönale, Stundenzettel -> Regiebericht, Nachtrag -> Nachtrag (Mehrkostenforderung). Sources: PlanRadar AT on ÖNORM B 2110 (https://www.planradar.com/at/oenorm-b-2110-dokumentation-auf-der-baustelle/, accessed 2026-10-05: "förmliche Übernahme", Regieleistungen daily records, 7 day submission), WKO knowhowbau Übernahme (https://www.wko.at/oe/gewerbe-handwerk/bau/knowhowbau-4-uebernahme-2024.pdf, accessed 2026-10-05).

### Slovenian (sl.json)

| key | current | proposed |
|---|---|---|
| wizard.warnPerRoof | Seznam je sešteti iz posameznih streh, ... | Seznam je seštet iz posameznih streh, ker načrt nima skupnega seznama. |
| sub.changeOrders | Nadgradnje | Dodatna dela |
| sub.changeOrdersEmpty | Ni prijavljenih nadgradenj. | Ni prijavljenih dodatnih del. |
| notify.pref.change_order_submitted | Prijavljena nadgradnja | Prijavljeno dodatno delo |
| notify.pref.change_order_decided | Odločitev o nadgradnji | Odločitev o dodatnem delu |
| projects.status.paused vs status.paused | Na čakanju / Na pavzi | Na pavzi in both |
| notify.pref.material_check_completed | Prevzem materiala | Prejem materiala (prevzem is also the Abnahme word) |
| final.doc.registers | Pregledi | Evidence |
| settings.inviteMemberNote | Sodelavec dobi račun v vašem podjetju. | Sodelavec dobi uporabniški račun v vašem podjetju. |
| settings.crewShareMessage | ... Računa ne potrebujete. | ... Registracija ni potrebna. |
| settings.crewLinkNote | ... Brez računa in brez gesla. | ... Brez registracije in brez gesla. |
| settings.notifNote | Velja samo za vaš račun. ... | Velja samo za vaš uporabniški račun. ... |
| auth.submit | Vstopi | Prijava |
| hours.daysLeft / hours.deemedNote / hours.doc.deemedNote / landing.truth2Body | delovni dnevi | dnevi (pon. do sob., brez praznikov); the clock counts Saturdays (lib/hours-shared.ts:64-72) |

### English (en.json)

| key | current | proposed |
|---|---|---|
| hours.title, hours.tabHours, sub.hours, landing.truth2Title, notify.pref.hours_* | Hourly work | Daywork |
| landing.subtitle | ... hourly work and change orders ... | ... daywork and change orders ... |
| landing.paperDoc2, final.doc.title2, notify.body.acceptance_signed, landing.paperBody | Acceptance protocol | Acceptance certificate |
| projects.scheduleAhead / scheduleBehind | # working days spare / over | # working days ahead / behind |
| projects.scheduleOnTime | Exactly on time | On schedule |
| auth.submit | Enter | Sign in |
| landing.point1 | one handed | one-handed |
| landing.truth2Body | The six working day clock runs visibly. | The six-day clock (Monday to Saturday) runs visibly. |
| wizard.warnNotK2 / warnMeta / badType | I do not recognise ... / I did not read ... / I only accept ... | This file was not recognised as a K2 report. / Some project details could not be read from the plan. / Only a K2 report in PDF format is supported. |
| invoice.doc.reverseChargeTitle | Tax clause | VAT note |
| crew.tabs.diary | Diary | Log |
| final.request | Complete the project | Report completion |

## Unverified

- Production redaction of server action error messages: sourced (Next.js error.js docs, vercel/next.js issue 78573, discussion 49426), not reproduced on belin-app.vercel.app because reproducing needs a submit.
- ÖNORM B 2110 deemed acknowledgement of Regieberichte when the client is silent: not verified (only the 7 day submission duty is sourced).
- Exact Austrian reverse-charge invoice wording (reference to § 19 Abs. 1a UStG): not verified.
- Signed-in screens could not be re-shot today (database paused); UI evidence is the 31.08 German shots.
