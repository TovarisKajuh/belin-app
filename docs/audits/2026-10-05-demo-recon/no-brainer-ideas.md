# Recon: no-brainer ideas (key: no-brainer-ideas)

Date: 2026-10-05. Read-only recon. Nothing in the repo was changed, nothing was submitted in the app.
Tiers: FACT (sourced, dated), J (judgment). Severity is measured against tomorrow's meeting.

## 0. Read this first: the meeting cannot run today

Four infrastructure facts found while trying to drive the app. They are not ideas, they are preconditions for every idea below.

| # | Severity | What | Evidence | Fix (who, time) |
|---|---|---|---|---|
| F1 | blocker | The Supabase project `belin` (xrwncpngjajosstvkign) is PAUSED. The org is on the Free plan. All three projects in the org are INACTIVE. Signing in lands on a blank navy screen. | Supabase connector get_project: `"status":"INACTIVE"`; get_organization: `"plan":"free"`; `nslookup xrwncpngjajosstvkign.supabase.co` returns Non-existent domain; screenshot `recon/no-brainer-ideas/epc-after-demo-login.png` (blank page at /sl/app after demo login). FACT: "Free projects are paused after 1 week of inactivity", Pro "from $25/month", paid projects never pause (supabase.com/pricing, accessed 2026-10-05). | Founder: Resume project in the Supabase dashboard NOW (resumes can be slow, see github.com/supabase/supabase/issues/37453), upgrade the org to Pro so it never pauses during a pilot, then `npm run seed` (seed dates are relative to the run date, so the hour sheet countdown and "today" are only right if seeded the evening before). 0.5 h plus waiting. |
| F2 | blocker | getbelin.com serves the OLD Belin 1.0.0 CRM landing page ("Every kWh starts here", fake customer logos SolarTech GmbH, GreenPower AG, "2,400+ solar projects managed", "EUR 50M+ revenue tracked", a different logo). Every Belin PDF footer, every email footer, the sender address and the landing "Pišite nam" link point a buyer at it. | Screenshot `recon/no-brainer-ideas/getbelin-com.png`; Vercel connector: getbelin.com and www.getbelin.com belong to project `belin-swsc`, app.getbelin.com to project `belin`, `belin-app` has only belin-app.vercel.app. Code: lib/pdf/theme.tsx:288 prints getbelin.com on every PDF, lib/email-shared.ts:65, lib/email.ts:19, components/landing/Story.tsx:136. | Founder in Vercel dashboard: remove the three getbelin.com domains from `belin-swsc` and `belin`, add getbelin.com (+ www redirect) to `belin-app`. DNS already verified on Vercel. 0.5 h. This IS the landing page answer: the domain on the PDFs becomes the real product. |
| F3 | high | The Resend sending domain getbelin.com has status `failed`. Magic links and notifications are sent from obvestila@getbelin.com. Production has no password login (runbook v2), so on production nobody can sign in if mail does not arrive. | Resend connector list-domains: getbelin.com "Status: failed" (avesol.si is verified); `nslookup -type=txt resend._domainkey.getbelin.com` Non-existent domain; DMARC is `p=quarantine`. | Founder: open the domain in Resend, re-add the DKIM TXT it shows, verify, then send himself a magic link. 0.5 h. |
| F4 | high | Server functions run in Washington D.C. (iad1) while the database is in Frankfurt. Every query crosses the Atlantic twice (slow dashboard), and the login page claims "Podatki v EU, Frankfurt" while personal data (A1, ID copies) is processed in the US. | Response header on production: `X-Vercel-Id: fra1::iad1::...` for /sl/login and /sl/app. No `regions` or `preferredRegion` anywhere (next.config.ts, no vercel.json). FACT: default region is iad1 for all new projects; Hobby may pick a single region (vercel.com/docs/functions/configuring-functions/region, accessed 2026-10-05). | Add `vercel.json` with `{"regions":["fra1"]}`, deploy, confirm header reads `fra1::fra1`. 0.25 h. |

Further findings that shape the ideas:

- F5 (blocker if the prospect is Slovenian, high otherwise): the demo EPC is "Sonce Energija d.o.o.", a real ZSFV member company (scripts/seed-demo.mjs:143; docs/gtm/INDEX.md "Standing constraints"). It prints as "Naročnik" on the acceptance protocol (assets/marketing/docs/abnahme.png). Showing a Slovenian EPC a fabricated project under a competitor's real name is the single most embarrassing thing that can happen in the room. Idea 1 fixes it.
- F6 (high): runbook v2 beat 4 ("Show the crew link as a QR from Settings ... no account, no password") and beat 2 ("tap a name") are stale. There is no QR anywhere in the codebase (grep for qr/qrcode finds only a comment in app/[locale]/app/[projectId]/po/page.tsx:31; no QR package in node_modules). Crew now join by typing an email and opening a mail (components/crew/CrewClaim.tsx, DECISIONS 2026-08-13), and demo addresses on -demo.si are refused (lib/email.ts:26). A prospect cannot join live today. Idea 21 fixes it.
- F7 (medium, high if the prospect is Austrian): the Regiebericht says the six Werktage period was "vereinbart" (messages/de.json:700) but no document the two parties exchange states it, and Austria runs on ÖNORM B 2110, not VOB/B. Idea 4 fixes it.
- F8 (medium): the launch splash plays for about 4.25 s on EVERY full page load (components/SplashGate.tsx renders BelinSplash without `once`; components/BelinSplash.tsx: END 3.05 s + HOLD 0.6 s + FADE 0.6 s). Screenshots landing.png and login.png still show only the splash 1.5 s after network idle. On a crew phone that cold-starts the PWA every morning this is 4 s of nothing. Fix: pass `once`, shorten to about 1 s. 0.5 h.
- F9 (medium): numbers are not localized. `${core.kwp} kWp` in components/epc/EpcDashboard.tsx:42 and components/epc/dashboard/RoofPanel.tsx:24 prints "245.7 kWp" in Slovenian and German. The 2026-08-13 captures show "5.9 %/dan" beside "6,5 %/dan" (assets/marketing/raw/epc-dashboard.png) and "58.3 %" on the crew phone (assets/marketing/raw/crew-phone.png). Same capture shows the Potrdi and Zavrni buttons on different baselines (assets/marketing/raw/hours-countdown.png). Current state could not be re-checked because the DB is paused.
- F10 (medium): no offline queue exists (no service worker, no IndexedDB; only components/crew/InstallHint.tsx uses localStorage), although HANDOFF section 3 promised offline capture and the landing says "tudi na slabi povezavi". Do not claim offline in the meeting.
- F11 (medium): change orders (Nachträge) have no PDF. app/api/pdf has abnahme, invoice, po, regie and report only, although generated_documents.kind already allows 'nachtrag' (supabase/migrations/20260717210000_init_v1_schema.sql:365).
- F12 (medium): document_expiring notifies the SUB only (lib/notify-shared.ts:53). The EPC, who carries the withholding and wage liability, is never told.
- F13 (low): organizations.logo_path exists (supabase/migrations/20260720200000_accounts_settings.sql:13) and is read nowhere (grep). Free real estate for idea 1.
- F14 (low): lib/weather.ts calls the free Open-Meteo API. FACT: "You may only use the free API services for non-commercial purposes" (open-meteo.com/en/terms, accessed 2026-10-05). Fine for tomorrow, a licence gap before charging.
- F15 (low): photo capture time is thrown away. components/crew/PhotoCapture.tsx re-encodes through a canvas (strips EXIF) and entry_photos.taken_at is never written (only appears in lib/database.types.ts).

## 1. How the buyer thinks (J)

The person across the table is the owner or a Bauleiter of a commercial-roof EPC. He has three tools plus WhatsApp and Excel (HANDOFF section 7). He is being sold software by a subcontractor, so his first silent question is "what is in it for AVESOL". He decides on three things: (a) will my subs actually use it without me chasing them, (b) does it put money back in my pocket or keep it there, (c) can I get out if it fails. In a contracting market the money argument outranks the time argument (docs/gtm/knowledge/market-icp-si.md section 2: "Sell the downside, not the upside"). So every idea below is phrased as the sentence he would say to his partner after the meeting.

## 2. The ideas

Each idea: what it is, why the buyer cares (his words), how to build it on THIS codebase, effort for an AI coding agent in this repo, and the demo moment.

### A. Demo personalization

**1. Their company on every screen and every document.**
- What: the demo EPC is renamed to the prospect's company, with their logo in the app header and in the header of every PDF, and the two demo projects renamed to plausible roofs in their region.
- Why: "That is already my company's paperwork." Also removes F5. J.
- How: scripts/seed-demo.mjs lines 139 to 147 (org upsert) and 220, 371 (project names, addresses, lat/lng) read `SEED_EPC_NAME`, `SEED_EPC_COUNTRY`, `SEED_REGION` from .env.local; scripts/seed-documents.ts re-renders the staged naročilnice so their hashes match. Logo: upload to an existing bucket, store in organizations.logo_path (column exists, unused), render with @react-pdf `Image` in `Header` in lib/pdf/theme.tsx (around line 253) and as an `<img>` next to the project name in components/project/CommandBar.tsx. Signed URL fetched once per render inside renderDocument.
- Effort: 2.5 h (rename 0.5, PDF logo 1.5, header logo 0.5).
- Demo moment: the first dashboard screen and the acceptance protocol both say "Naročnik: <their company>" under their logo.

**2. Their own K2 plan, parsed live.**
- What: get one real K2 Base report from the prospect tonight, pre-flight it, then drop it into the wizard in the meeting.
- Why: "It read MY roof. Nobody typed that." FACT: the wizard is plan-first and a K2 parse never fails, it warns (DECISIONS 2026-07-20).
- How: founder asks for the PDF by WhatsApp tonight; agent runs `npm run k2:try <file>` (scripts/k2-try.ts) and checks roofs, module lines and country (an AT address with a four digit postcode falls back to the EPC country and shows an amber field, DECISIONS 2026-08-13). If they do not use K2, use the founder's own report, never another customer's.
- Effort: 0.5 h.
- Demo moment: runbook beat 1 with their own file. "You did not type a project. You reviewed one."

**3. Their own subcontractors in the picker.**
- What: the two extra demo sub orgs (SUB_ORG_2 "Montaža Kos", SUB_ORG_3 "Elektro Vrhnika" in scripts/seed-demo.mjs) carry the names of two or three subs the prospect really uses.
- Why: "Those are my guys. They would be in there tomorrow." J.
- How: env-driven names in the same seed block as idea 1. No code beyond the seed.
- Effort: 0.5 h (shared with idea 1).
- Demo moment: in the wizard's "attach subcontractor" step they see their own sub.

**4. The contract clock written into the order (clause pack in the naročilnica).**
- What: the naročilnica the sub accepts (hash-bound) gains four short clauses: hour sheets count as approved if not answered within N working days; Regie must be announced in Belin before it starts; notices, hour sheets and change requests sent through Belin satisfy the agreed written form; the order's deadline and penalty terms. N and the day type default per country (DE: 6 Werktage per § 15 Abs. 3 VOB/B; AT and SI: whatever the EPC types, default 6) and are stored on the project.
- Why: "So the six days are not your rule, they are in my order, and I set the number." For an Austrian EPC this replaces a German norm that does not apply. FACT: § 15 Abs. 3 VOB/B, "Nicht fristgemäß zurückgegebene Stundenlohnzettel gelten als anerkannt" and "Dem Auftraggeber ist die Ausführung von Stundenlohnarbeiten vor Beginn anzuzeigen" (dejure.org/gesetze/VOB-B/15.html, accessed 2026-10-05). FACT: § 127 Abs. 2 BGB, for an agreed written form "genügt ... die telekommunikative Übermittlung" (gesetze-im-internet.de, accessed 2026-10-05). FACT (secondary): ÖNORM B 2110 treats unchallenged Bautagesbericht entries as confirmed after 14 days, clause 6.2.7.2.3 (bw-b.com, accessed 2026-10-05); the standard itself is paywalled, so treat the AT number as unverified. Clause wording needs a lawyer before paid use (HANDOFF section 8). J.
- How: migration adding `projects.regie_objection_days int not null default 6` and `projects.regie_day_kind text check in ('werktage','kalendertage')`; lib/hours-shared.ts already takes the day count as a parameter (DECISION_WORKING_DAYS "A parameter everywhere"), so lib/data/hours.ts reads the project value instead of the constant; components/po/PoBuilder.tsx gets the field; lib/pdf/narocilnica.tsx renders the clauses in the acceptance section (around line 98, `acceptanceTitle`/`acceptanceBody`); strings in messages/sl.json, de.json, en.json (must be real German for a DACH buyer). Run `npm run gen:types`, add a migration file, `npm test`.
- Effort: 3 h.
- Demo moment: open the sent naročilnica, point at the clause: "Your sub agreed to this when he accepted. Now the countdown is your contract, not my software."

**5. Run the room in their language, documents included.**
- What: the demo projects carry `language` = the prospect's language, so every PDF prints in it; the founder walks the German flow once tonight.
- Why: "It speaks to my office in German and to my Slovenian crews in Slovenian." FACT: catalogs are complete in three languages since 2026-08-12 (CHANGELOG), but runbook v2 says the product was driven hardest in Slovenian.
- How: seed sets projects.language and country per idea 1; rehearsal only.
- Effort: 0.5 h.
- Demo moment: the crew phone in Slovenian, the dashboard and the Abnahmeprotokoll in German, same project.

### B. Money the EPC keeps or saves

**6. Behinderungsanzeige from an obstruction, forwarded upstream to the building owner.**
- What: on an incident of kind `obstruction`, one button produces a formal written hindrance notice PDF: who, what, since when (site-local time), photos, idle crew size from that day's entry, expected impact, and, for German projects, the § 6 Abs. 1 VOB/B basis. The EPC can issue it in its OWN name to its own client (the Bauherr), because the obstruction (missing scaffold, roof not cleared, grid operator) usually comes from upstream. Rain stops produce a "Witterungsnachweis" (weather log) instead, because normal weather is explicitly not a hindrance.
- Why: "The day my sub cannot work because the owner's roofer is late, I have the written notice out before lunch, and my own deadline moves." FACT: "Glaubt sich der Auftragnehmer ... behindert, so hat er es dem Auftraggeber unverzüglich schriftlich anzuzeigen" and "Witterungseinflüsse ..., mit denen bei Abgabe des Angebots normalerweise gerechnet werden musste, gelten nicht als Behinderung" (§ 6 Abs. 1 and Abs. 2 Nr. 2 VOB/B, dejure.org, accessed 2026-10-05).
- How: new lib/pdf/obstruction-notice.tsx through `renderDocument` (lib/pdf/theme.tsx; tests/pdf-render-guard.test.ts forbids direct renderToBuffer); new route app/api/pdf/incident/[incidentId]/route.ts copying the guard pattern of app/api/pdf/regie/[sheetId]/route.ts (person actor, not crew, requireProjectActor); data from incidents, incident_photos, daily_entries (headcount, weather) via lib/data/incidents.ts; button in components/epc/dashboard/IncidentsPanel.tsx with a small recipient form (name and address of the addressee, free text, not stored as an entity). Strings in all three catalogs.
- Effort: 3 h.
- Demo moment: crew taps "Prijavi zaplet", obstruction, photo. Ten seconds later the EPC clicks "Behinderungsanzeige" and holds a signed-looking PDF addressed to the building owner.

**7. Shortfall claim to the wholesaler from the day-one material check.**
- What: from a material check with partial or missing lines, one button produces a Fehlmengenanzeige / reklamacija: delivery date and time, the dobavnica photo, the pallet photo, each short line with ordered, delivered and missing quantity, checked by whom.
- Why: "Krannich credits me what I claim the same day with the delivery note, not what I remember three weeks later." FACT: § 377 Abs. 1 HGB, the merchant buyer must inspect "unverzüglich nach der Ablieferung" and notify defects "unverzüglich", otherwise the goods count as approved (gesetze-im-internet.de, accessed 2026-10-05). Whether a quantity shortfall falls under § 377 is a legal question, J.
- How: new lib/pdf/shortfall.tsx; route app/api/pdf/shortfall/[checkId]/route.ts; data material_checks, material_check_items (status, missing_qty), material_check_docs, material_items (lib/data/materials.ts getMaterialState); button in components/epc/dashboard/MaterialPanel.tsx.
- Effort: 2.5 h.
- Demo moment: runbook beat 3, crew marks one line "Delno". On the laptop: "Reklamacija dobavitelju" PDF, ready to email, in 3 seconds.

**8. A progress statement the EPC invoices its own client with.**
- What: one click on the dashboard produces a dated, quantity-based progress statement: per scope item target, installed to date, percent, the photos behind each, and the value if the order lines carry prices.
- Why: "My sub's quantities become my installment invoice to the building owner this week. That is cash." FACT: § 16 Abs. 1 Nr. 1 VOB/B, Abschlagszahlungen "in Höhe des Wertes der jeweils nachgewiesenen vertragsgemäßen Leistungen", proven "durch eine prüfbare Aufstellung"; Nr. 3, due "binnen 21 Tagen nach Zugang der Aufstellung" (dejure.org, accessed 2026-10-05). HANDOFF section 3 already names this as unique.
- How: new lib/pdf/progress-statement.tsx; data scope_items, entry_quantities, entry_photos, purchase_order_lines; reuse lib/progress.ts for the weighted percent; route app/api/pdf/progress/[projectId]/route.ts; button in components/epc/dashboard/ScopeByPhase.tsx.
- Effort: 3 h.
- Demo moment: on Trenutno at 58 percent: "Izkaz napredka za situacijo", a PDF whose numbers equal the ring on the screen.

**9. Penalty reservation guard at the acceptance.**
- What: when the acceptance starts after projects.planned_end or after the naročilnica deadline, the penalty reservation box is pre-ticked, outlined in amber, with "Finished N working days late. Without this reservation the penalty is lost."
- Why: "This is the one checkbox that has cost people five figures." FACT: "Hat der Auftraggeber die Leistung abgenommen, so kann er die Strafe nur verlangen, wenn er dies bei der Abnahme vorbehalten hat" (§ 11 Abs. 4 VOB/B, dejure.org, accessed 2026-10-05).
- How: components/final/AcceptanceFlow.tsx around line 252 (`ac-penalty`); lib/data/acceptances.ts getAcceptance returns `lateByWorkingDays` computed with addWorkingDays logic from lib/hours-shared.ts against projects.planned_end and purchase_orders.deadline; the reservation stays a deliberate human choice (pre-ticked, not forced).
- Effort: 1.5 h.
- Demo moment: runbook beat 6, the box is already lit when the acceptance opens.

**10. Fictitious acceptance clock after the handover request.**
- What: when the sub presses "Zaključi projekt", both sides see a countdown: "Deemed accepted on 22.10. unless an acceptance is held", 12 working days.
- Why: "I will never again be accepted by default with my defects and penalty unreserved." FACT: "so gilt die Leistung als abgenommen mit Ablauf von 12 Werktagen nach schriftlicher Mitteilung über die Fertigstellung" and reservations for known defects and penalties must be made by then (§ 12 Abs. 5 VOB/B, dejure.org, accessed 2026-10-05).
- How: the request already exists as activity kind finalization_requested (DECISIONS 2026-08-12); components/final/FinalHub.tsx reads its timestamp and renders the same countdown component style as the hour sheets (components/hours/SheetList.tsx), using addWorkingDays(…, 12, country). Show for DE projects; for AT and SI show the clause-pack value from idea 4 or nothing.
- Effort: 2 h.
- Demo moment: right after "Zaključi projekt" the EPC screen shows the red countdown, then "Začni prevzem" makes it disappear.

**11. No Regie hour you did not see coming.**
- What: a one-tap "Najavi režijo" on the crew/sub side (what, why, photo, estimated hours) BEFORE the work starts; the Bauleiter answers yes or no from the notification; hour sheet lines can link to the announcement.
- Why: "My sub cannot surprise me at the final invoice, and if I said nothing he did tell me." FACT: § 15 Abs. 3 Satz 1 VOB/B requires announcing hourly work before it starts (dejure.org, accessed 2026-10-05).
- How: smallest path reuses change_orders with a new `kind` column ('extra','regie_notice') via migration, or a new requests.type 'regie_notice' (requests already has type, text, photo_path, status, response_note: supabase/migrations/20260717210000_init_v1_schema.sql:180); components/crew/RequestButton.tsx gets the option; components/epc/dashboard/RequestsPanel.tsx shows approve/decline; notify kind already exists (request_created).
- Effort: 3 h.
- Demo moment: crew announces "4 h čiščenje po neurju" with a photo; the EPC taps "Strinjam se"; the later hour sheet shows "najavljeno 10.10. 07:51, odobril Marko".

**12. Regie spend chip.**
- What: a chip on the dashboard stat row: "Režija: 19 h, 1.140 EUR potrjeno, 5 h čaka".
- Why: "I see the Regie bill growing every day, not at the end." J.
- How: lib/data/epc-dashboard.ts sums hour_sheet_lines by sheet status and multiplies by purchase_orders.regie_hourly_rate of the accepted order (lib/invoice-shared.ts already does the multiplication); components/epc/dashboard/StatRow.tsx renders it with Intl.NumberFormat.
- Effort: 1 h.
- Demo moment: Trenutno dashboard, next to tempo and crew size.

**13. "Two working days left" nudge to the Bauleiter.**
- What: a daily job emails and notifies the EPC when an hour sheet or a fictitious acceptance clock is two working days from deciding itself.
- Why: "I do not have to live in the app to be protected." J.
- How: the codebase has no cron (CHANGELOG 2026-08-12). Add vercel.json `crons` calling app/api/cron/daily/route.ts guarded by a CRON_SECRET header; it calls persistDeemed per project (lib/data/hours.ts:304) and emits a new notify kind `hours_deadline_near` (lib/notify-shared.ts recipients EPC_ONLY). Vercel Hobby cron frequency limits are unverified, so assume once a day.
- Effort: 2.5 h (and it unlocks ideas 14, 17, 33).
- Demo moment: show the email in the founder's inbox: "Še 2 delovna dneva: list št. 2, 5 h".

**14. Warranty end calendar.**
- What: every accepted project shows "Garancija do 13.08.2030" on the portfolio, and 90 days before, the EPC gets "inspect the roof before the warranty ends".
- Why: "I find the leaking penetration while the sub still owes me the fix." FACT: under VOB/B the limitation period "beträgt sie für Bauwerke 4 Jahre" (§ 13 Abs. 4 Nr. 1); a written defect demand starts two more years from receipt (§ 13 Abs. 5 Nr. 1) (dejure.org, accessed 2026-10-05). AT and SI periods not researched, J per country default editable.
- How: acceptances.warranty_start exists (supabase/migrations/20260812110000_invoices_acceptance_fields.sql); lib/data/portfolio.ts adds the end date; components/app/ProjectList.tsx shows it; reminder via the cron of idea 13.
- Effort: 2 h.
- Demo moment: zoom-out (runbook beat 7): four delivered projects, each with a warranty end date, one amber.

**15. Defect close-out loop with a written demand.**
- What: defects from the acceptance appear on the sub's phone with their deadline; the sub closes one with an after-photo; the EPC confirms; an overdue one produces a written defect demand PDF.
- Why: "Defects stop living in my email." FACT: § 13 Abs. 5 Nr. 1 VOB/B requires the demand "schriftlich" (dejure.org, accessed 2026-10-05).
- How: migration adding acceptance_defects.resolved_photo_path, resolved_at, confirmed_at, confirmed_by_person; sub view in components/sub/SubHome.tsx; EPC list in components/final/FinalHub.tsx; PDF lib/pdf/defect-demand.tsx.
- Effort: 4 h.
- Demo moment: the defect added in the acceptance shows up on the crew phone seconds later as a to-do.

### C. Liability the EPC sheds

**16. "Pay safely" gate on every invoice.**
- What: on the EPC's view of a sub invoice, a card that says, as of today: Freistellungsbescheinigung valid until X (DE), HFU listed as checked on date Y (AT), A1 for every worker valid, and the consequence if not: "withhold 15 percent" (DE) or "remit 25 percent to the ÖGK service centre" (AT). Links to the official checks.
- Why: "I can pay this invoice in full without risking that I pay the tax a second time." FACT DE: the recipient must withhold "15 Prozent" unless a Freistellungsbescheinigung under § 48b is presented (§ 48 EStG, gesetze-im-internet.de, accessed 2026-10-05); validity can be confirmed free in the BZSt EIBE portal after one-time registration (bzst.de, haufe.de via search, accessed 2026-10-05). FACT AT: client liability 20 percent social insurance plus 5 percent wage taxes for construction services, 32 plus 8 percent for labour leasing since 1 January 2026, and it "entsteht grundsätzlich mit der Zahlung"; avoided if the sub is on the HFU list at payment time or 25 percent is remitted (wertvoll.tax, October 2026, accessed 2026-10-05). The HFU list is public and free to query at sozialversicherung.at/agh (search result, accessed 2026-10-05).
- How: components/final/InvoiceCard.tsx (EPC side) gets a compliance block fed by the same query lib/data/epc-dashboard.ts:313 already uses for the sub's documents (types freistellungsbescheinigung, hfu_status, a1; lib/vault-shared.ts expiryState); an "HFU checked today" action stores a vault row of type hfu_status with valid_until = today, uploaded_by the EPC person (needs the EPC to be allowed to add to the sub's vault: one guarded server action).
- Effort: 2.5 h.
- Demo moment: on the invoice the sub just generated: three green lines and "Varno za plačilo v celoti". Then flip one document to expired in a second browser tab: the card turns red and shows the withholding amount in euros.

**17. The EPC is told when a sub's document expires.**
- What: document_expiring also reaches the EPC for every project where that sub is active, plus a red line in the dashboard alert strip.
- Why: "If his A1 runs out while his men are on my roof, I hear it from Belin, not from customs." J. Supported by FACT: § 14 AEntG makes the commissioning company liable for the sub's minimum wages "wie ein Bürge, der auf die Einrede der Vorausklage verzichtet hat" (gesetze-im-internet.de, accessed 2026-10-05).
- How: lib/notify-shared.ts:53 change `document_expiring: SUB_ONLY` to BOTH; the emitter in lib/data/epc-dashboard.ts around line 378 already has the project; components/epc/dashboard/AlertStrip.tsx shows it.
- Effort: 1 h.
- Demo moment: the seeded document expiring in 18 days (runbook v2) already lights the strip.

**18. Inspection mode on the crew phone.**
- What: a large "Kontrola" button on the crew home that shows, full screen, one swipe per worker: photo ID, A1, ZKO3 confirmation (AT), and the company's wage document folder, readable in sunlight.
- Why: "When the Finanzpolizei is on my roof, my sub's foreman shows everything in one minute and my site does not stop." FACT (secondary): documents must be at the site or immediately accessible electronically at the time of inspection; a missing ZKO3 notification costs up to EUR 20,000 per employee, missing wage documents the same (team23tax.at summary of LSD-BG, accessed 2026-10-05). FACT (secondary): the client is liable as surety for wages of posted workers on construction work under § 9 LSD-BG (search summary, accessed 2026-10-05).
- How: components/crew/CrewTabs.tsx (Pregled) gets the button; new components/crew/InspectionMode.tsx; data from documents by person_id and org_id via a crew-safe read in lib/data/org-settings.ts (listVaultDocs exists for office people only, so add a read limited to the signed-in crew member's own org); signed URLs from lib/storage.ts.
- Effort: 3 h.
- Demo moment: hand the buyer the phone: "Inspector at the ladder. Press this." Six documents, one swipe each.

**19. The subcontractor's compliance passport.**
- What: a one-page PDF and a share link of a sub's vault with traffic lights, which the sub can send to any EPC.
- Why: "Onboarding a new sub is two minutes, not six emails asking for six PDFs." Strategic for Belin (HANDOFF section 2). J.
- How: lib/pdf/passport.tsx over documents (lib/data/org-settings.ts listVaultDocs); route app/api/pdf/passport/[orgId]/route.ts, office-only.
- Effort: 2.5 h.
- Demo moment: from AVESOL's settings, "Pošlji potni list" produces the page the EPC would otherwise chase.

**20. Answer the AVESOL question before it is asked.**
- What: a one-page "Kdo vidi kaj" matrix (EPC, sub office, crew, Belin operator) and a 20 second live proof: sign in as the AVESOL office and show that a project with another sub does not exist for it.
- Why: "You run a montage company. Do you see my other subs and my prices?" The GTM base says this will come up in the first ten conversations (docs/gtm/knowledge/founder-groundtruth.md section 6). J.
- How: verify requireProjectActor scoping in lib/actor.ts; seed one demo project with SUB_ORG_2 (the portfolio seed already has past projects, scripts/seed-demo.mjs:705); the matrix is a page in the leave-behind (idea 39). Be honest that the operator has database access and that a DPA governs it.
- Effort: 1 h.
- Demo moment: the founder raises it himself in minute two.

### D. Zero-friction rollout

**21. A QR on the wall and a one-hour guest pass.**
- What: a large QR of the crew link in Settings and as a wall overlay on the dashboard; plus, for meetings only, a "Gost" pass that mints a single-use one-hour login for a disposable crew person on the Dan 1 project, so the buyer's own phone lands signed in without waiting for an email.
- Why: "My roofer will not read instructions. If I can scan it, he can." J.
- How: add a QR encoder (a small dependency such as `qrcode` rendering SVG, or an inline encoder) in components/share/ShareLink.tsx and components/settings/CrewLink.tsx; guest pass: an office-only server action, gated on DEMO_LOGIN === "1" exactly like getSiblingToken (DECISIONS 2026-08-12), that creates a crew people row on the demo sub org and inserts a login_tokens row exactly as scripts/marketing/shoot.mjs magicLink() does, returning the verify URL encoded in the QR. Update the runbook security ritual (revoke after the meeting).
- Effort: 3 h.
- Demo moment: runbook beat 4 restored: the buyer scans, submits a report from his own phone, the wall dashboard updates in two seconds.

**22. WhatsApp-first invitations.**
- What: invite a sub company by WhatsApp, not only email: prefilled message in the sub's language with the project, the address and the Maps link.
- Why: "My subs live in WhatsApp." HANDOFF section 7: EPCs run WhatsApp and Excel. J.
- How: components/settings/InvitePanel.tsx calls lib/data/invites.ts createInvite (email is nullable in the invites table) and passes the link to the existing ShareLink WhatsApp button.
- Effort: 1.5 h.
- Demo moment: the founder sends the invite to his own WhatsApp on the projector.

**23. Paste your sub list.**
- What: paste a list of company names and emails (or a column from Excel) and invite them all.
- Why: "Send you my list after the meeting and they are all in tonight." J.
- How: textarea parser in components/settings/InvitePanel.tsx, loop over createInvite in app/[locale]/app/settings/actions.ts, one localized email each (needs F3 fixed).
- Effort: 2 h.
- Demo moment: paste five lines, five green ticks.

**24. End the meeting with their own account and their first project in it.**
- What: a founder-only action that creates the prospect's EPC org and admin person (their real email), attaches AVESOL as sub, and moves the K2 project created in idea 2 into it. The buyer leaves signed in on his own laptop.
- Why: "We already started." Turns a demo into a pilot. J.
- How: office-only server action using organizations, people, invites (kind epc_member) and a magic link; reuses create_project_from_review for the project (or re-creates it from the saved plan_imports.parsed). Requires F1 and F3.
- Effort: 3 h.
- Demo moment: last five minutes: the buyer opens the email on his phone and is in.

**25. Offline outbox for crew reports.**
- What: a report or incident submitted without signal is kept on the phone, shown as "Čaka na signal", and sent when the phone is back online, never duplicated.
- Why: "Rural roofs have no LTE. Nothing my guys enter may be lost." HANDOFF section 3 promised it. J.
- How: IndexedDB outbox in components/crew/CrewReportForm.tsx and IncidentButton.tsx (photos as blobs), retry on `online` and `visibilitychange`, idempotency through the existing daily_entries.client_generated_id.
- Effort: 5 h. Probably after the meeting; until then, do not claim it (F10).
- Demo moment: airplane mode, submit, the badge, airplane mode off, the dashboard updates.

### E. Risk reversal

**26. A one-page pilot agreement, signed on the screen.**
- What: one page: one project, 60 days, free, subcontractors free forever, everything exportable at the end, data in the EU, DPA attached, cancel any time, two success criteria written down now (for example: every working day logged, zero disputed Regie hours). Signed by both on the existing signature pad and emailed as a PDF.
- Why: "I risk nothing and I know what success looks like." J. GTM base has no pilot file yet (docs/gtm/INDEX.md: craft-offer-and-pilot.md not started), so the terms are the founder's call.
- How: lib/pdf/pilot.tsx through renderDocument; a small page reusing components/SignaturePad.tsx; store as a generated document of the founder's org.
- Effort: 1.5 h.
- Demo moment: the close. Same signature gesture as the acceptance ten minutes earlier.

**27. Export everything.**
- What: one ZIP per project: every stored PDF, every original photo, CSV of entries, quantities, hours and change orders, the activity log as JSON, and a manifest with a sha256 per file.
- Why: "If I leave, I leave with everything, and I can prove nothing was changed." J.
- How: a zip library (for example fflate) in app/api/export/[projectId]/route.ts, office-only, streaming from storage.
- Effort: 4 h.
- Demo moment: click, download, open the folder on the projector.

**28. DPA ready, and the EU claim made true.**
- What: a Slovenian and German AVV/DPA template page with the subprocessor list (Supabase Frankfurt, Vercel, Resend), linked from the privacy page, after fixing F4 so that processing really happens in Frankfurt.
- Why: "My data protection officer will ask first." FACT: the privacy copy already says DPAs exist (lib/legal-copy.ts:101 and :133); the region facts are in F4. A lawyer review stays required (HANDOFF section 8).
- How: new app/[locale]/avv/page.tsx using components/legal/LegalPage.tsx and lib/legal-copy.ts.
- Effort: 2 h.
- Demo moment: the buyer asks about GDPR, the founder opens the page.

### F. Trust and evidence

**29. A fingerprint and a verify QR on every document.**
- What: every stored document (completion report, acceptance protocol, invoice, naročilnica already) prints its sha256 and a QR to a public /verify page that says who issued it, when, for which project, and whether the bytes still match.
- Why: "Nobody can edit this PDF and pretend it is the original." FACT: the naročilnica already prints its hash and acceptance re-hashes it (lib/pdf/narocilnica.tsx:167, lib/data/purchase-orders.ts:364). J for the rest.
- How: add generated_documents.sha256 (migration); compute with sha256Of (lib/pdf/render-po.tsx:15) when storing; QR in the Footer of lib/pdf/theme.tsx; public route app/[locale]/verify/[hash]/page.tsx showing only metadata. Note the Regiebericht is rendered on demand and never stored (route comment in app/api/pdf/regie/[sheetId]/route.ts), so it is out of scope.
- Effort: 3.5 h.
- Demo moment: the buyer scans the QR on the printed Abnahmeprotokoll with his phone: "Preverjeno, nespremenjeno".

**30. Photo provenance.**
- What: read the capture time (and location if present) from the original photo before it is downscaled, store it, show "posneto 07:42, oddano 07:44", and flag photos older than a day.
- Why: "A photo from last week's job cannot pass as today's." J. Evidence for F15.
- How: a small EXIF DateTimeOriginal reader in components/crew/PhotoCapture.tsx before `downscale`; send taken_at with the upload; write entry_photos.taken_at in the submit RPC (column exists); render in components/epc/dashboard/PhotoGallery.tsx. iOS location stripping is unverified.
- Effort: 2.5 h.
- Demo moment: hover a photo in the day list: capture time beside the server time.

**31. The audit trail, visible.**
- What: a filterable timeline of the activity table (who did what, when) and an appendix page in the completion report.
- Why: "If it goes to court, I have the sequence of events." J.
- How: the activity table already records every event with actor and timestamp (schema line 195; kinds extended in supabase/migrations/20260812100000_incidents_notifications.sql); page under app/[locale]/app/[projectId]/; appendix in lib/pdf/completion.tsx.
- Effort: 2 h.
- Demo moment: after the live report in idea 21, the trail shows it at the top with the server time.

**32. Say out loud that the clock is the server's.**
- What: every entry and document shows "zapisano na strežniku 07:44:12" rather than nothing.
- Why: "The crew cannot backdate." FACT: the submit RPC computes the site-local date server-side (DECISIONS 2026-07-17 night). J for the wording.
- How: copy and one formatted timestamp in components/epc/dashboard/DailyLogFeed.tsx and lib/pdf/day-report.tsx.
- Effort: 0.5 h.
- Demo moment: one sentence while pointing at the day list.

### G. Small delights that read as quality

**33. Friday digest for the owner, with a "send now" button.**
- What: a weekly email per EPC owner: progress gained per project, three photos of the week, open items (hours pending, defects, expiring documents), next week's forecast.
- Why: "I read one email on Friday and I know all my roofs." J.
- How: lib/email.ts and lib/email-shared.ts renderEmail; data from lib/data/portfolio.ts; cron from idea 13; a "Pošlji povzetek zdaj" button in the portfolio header for the demo.
- Effort: 3 h (2 h if idea 13 exists).
- Demo moment: press the button, show the email arriving on the founder's phone.

**34. An honest evidence counter.**
- What: on the portfolio: "Ta mesec: 47 dnevnih poročil, 312 fotografij, 9 podpisanih dokumentov, 2 manjka materiala ujeta prvi dan." Only counts that come from rows, no invented savings figure.
- Why: "That is the paper trail I never had." J.
- How: counts over daily_entries, entry_photos, generated_documents, acceptances, material_check_items in lib/data/portfolio.ts; render in components/app/PortfolioHeader.tsx.
- Effort: 1.5 h.
- Demo moment: the zoom-out.

**35. A submit receipt that feels physical.**
- What: after "Pošlji poročilo": a check animation, the server time, "Nadzorna plošča posodobljena", and a short vibration on Android.
- Why: "The guy on the roof knows it went." J. iOS Safari support for navigator.vibrate is unverified (believed absent).
- How: components/crew/CrewReportForm.tsx success state; CSS in app/globals.css respecting prefers-reduced-motion.
- Effort: 1 h.
- Demo moment: on the buyer's phone during idea 21.

**36. Wall mode for the office TV.**
- What: a full-screen, high-contrast view per project or for all projects: ring, latest photo, today's crew, weather, rotating every 20 s, refreshed by the existing live ping.
- Why: "That goes on the screen in our office." J.
- How: `?wall=1` on app/[locale]/app/[projectId]/page.tsx and app/[locale]/app/page.tsx, hiding chrome; components/LiveRefresh.tsx already refreshes on ping.
- Effort: 2 h.
- Demo moment: put it on the meeting room screen while talking.

**37. The missing Nachtrag document.**
- What: a change order PDF: number, title, description, photos, amount, submitted and decided timestamps, who decided.
- Why: "Every extra has paper, not a WhatsApp thumbs-up." Fills F11, part of "every document".
- How: lib/pdf/nachtrag.tsx; route app/api/pdf/nachtrag/[changeOrderId]/route.ts copying the regie route guard; button in components/hours/ChangeOrderList.tsx; data in lib/data/change-orders.ts.
- Effort: 2 h.
- Demo moment: runbook beat 5, after approving the extra, "Prenesi PDF" exists for it like for the hour sheets.

**38. Print-perfect documents.**
- What: logo, "Stran 3 od 12", document number and hash on every page; physically print one of each before the meeting and check margins.
- Why: "Looks like it came from a serious company." J.
- How: the Footer in lib/pdf/theme.tsx already supports a page label; use it everywhere; combined with ideas 1 and 29.
- Effort: 1 h.
- Demo moment: hand over printed copies.

### H. The meeting itself

**39. A personalized leave-behind.**
- What: a PDF "Belin za <company>" with their name, their parsed project, the documents produced live in the meeting (acceptance, invoice, progress statement), the pilot terms and the founder's contact; emailed before he reaches his car.
- Why: "I can forward this to my partner tonight." J.
- How: the brochure pipeline already exists (lib/pdf/brochure.tsx, scripts/marketing/brochure.mjs); add a cover with their name and merge the generated PDFs. Domain must be fixed first (F2), because the brochure prints getbelin.com (lib/pdf/brochure.tsx:216, :383).
- Effort: 2 h.
- Demo moment: the email arrives during the goodbye.

**40. Objection cards, rehearsed.**
- What: five questions with answers rehearsed out loud: conflict of interest, price, "my subs will not use it", "we have Excel and WhatsApp", "what if you disappear".
- Why: a non-developer founder wins or loses the meeting on these. J. The GTM base says the AVESOL question will come up (founder-groundtruth.md section 6) and has no pricing file.
- How: non-code; one page in docs/demo/.
- Effort: 1 h.
- Demo moment: whenever they come up.

**41. A failure kit.**
- What: phone hotspot, a second browser profile already signed in, the 90 second product video (DECISIONS 2026-08-13), and printed PDFs, plus a seed run the evening before and a full dry run with a stopwatch.
- Why: a frozen screen in front of a buyer costs more than any missing feature. J.
- How: non-code checklist added to the runbook.
- Effort: 0.5 h.
- Demo moment: invisible if it works.

**42. Leave with a date, not a promise.**
- What: the pilot agreement (idea 26) names the actual project and a start date; the founder asks for it before standing up.
- Why: "Thinking about it" is where pilots die. J.
- How: non-code.
- Effort: 0.
- Demo moment: the last sentence.

## 3. Top 12, ranked by buyer impact times one-day feasibility

Precondition for all of them: F1 to F4 fixed by the founder first (about 2 hours of clicking and waiting, no code except vercel.json).

| Rank | Idea | Impact (J) | Effort | Why this rank |
|---|---|---|---|---|
| 1 | 1. Their company on every screen and document | 5 | 2.5 h | Fixes F5 and makes every later moment theirs. |
| 2 | 2. Their own K2 plan parsed live | 5 | 0.5 h | Highest impact per hour in the whole list. |
| 3 | 21. QR and one-hour guest pass | 5 | 3 h | Restores the strongest runbook beat, which is broken today (F6). |
| 4 | 16. "Pay safely" gate on the invoice (DE/AT) | 5 | 2.5 h | Money and liability in one card. For a Slovenian buyer swap in idea 8. |
| 5 | 8. Progress statement for their own installment invoice | 5 | 3 h | Cash flow for the EPC, not just control. |
| 6 | 26. One-page pilot agreement signed on screen | 5 | 1.5 h | Converts the demo; reuses the signature pad. |
| 7 | 6. Behinderungsanzeige upstream | 4 | 3 h | Turns a sub's incident into the EPC's own protection. |
| 8 | 9 + 10. Penalty guard and fictitious acceptance clock | 4 | 3.5 h | Two real legal traps, both from existing data. |
| 9 | 37. Nachtrag PDF | 4 | 2 h | Closes the "every document" gap (F11). |
| 10 | 7. Shortfall claim to the wholesaler | 4 | 2.5 h | Day-one money, already staged in the demo. |
| 11 | 4. Contract clock in the naročilnica | 4 | 3 h | Essential if the buyer is Austrian (F7). |
| 12 | 29. Fingerprint and verify QR | 4 | 3.5 h | The trust moment a buyer remembers. |

Sum: about 30 agent hours. One agent cannot do this in a day; three parallel agents can, if they touch different files. Cheapest add-ons if time remains: idea 17 (1 h), idea 12 (1 h), idea 32 (0.5 h), idea 34 (1.5 h). If only ONE agent is available: 1, 2, 21, 26, 9, 37, 17, in that order (about 12 hours).

## 4. Questions for the founder

1. Which company exactly, which country, which language in the room, and who sits there (owner or Bauleiter)? Is it the Salzburg EPC from the 2026-09-16 deck?
2. Can you get one of their real K2 reports tonight, their logo, and the names of two or three of their subs?
3. Will you resume the Supabase project now and upgrade to Pro (from USD 25 a month) so it never pauses during the pilot?
4. May the getbelin.com domain move to the belin-app project? It takes the old CRM landing page offline for good.
5. Will the demo run on your laptop (localhost, password login) or on production (email login only, currently broken by F3)?
6. What price will you say when asked? The GTM base has no pricing or pilot file yet.
7. How will you answer "you run a subcontractor, what do you see of my data"?
8. Pilot terms: length, free or paid, which two success criteria?

## 5. Unverified

- Whether Resend refuses sends from a domain in "failed" state (assumed). Resend's email list showed only two emails, both from avesol.si on 2026-09-24, so Belin's recent delivery history could not be read.
- How every signed-in screen looks today: the database is paused, so the visual judgments on app screens rest on the 2026-08-13 captures in assets/marketing/raw/.
- How long the Supabase resume takes.
- LSD-BG penalty amounts and § 9 LSD-BG wording come from secondary sources (team23tax.at, search summaries).
- ÖNORM B 2110 periods: secondary sources disagree (7 vs 14 days for submission); the standard is paywalled.
- Whether a quantity shortfall falls under § 377 HGB.
- BGB five-year period (§ 634a) for PV on an existing roof: depends on whether it counts as a Bauwerk.
- Austrian and Slovenian warranty and deemed-approval equivalents were not researched.
- iOS Safari support for navigator.vibrate; whether iOS keeps EXIF capture time and location for photos taken through a web file input.
- Vercel Hobby cron frequency limits.
- Whether the prospect uses K2 at all.

## 6. Artifacts

- Scripts: recon/no-brainer-ideas/shots.mjs (failed: DB paused), shots2.mjs, getbelin.mjs, q.mjs
- Screenshots: recon/no-brainer-ideas/landing.png, landing-full.png, landing-phone.png, landing-phone-full.png, login.png, epc-after-demo-login.png, getbelin-com.png
- Logs: recon/no-brainer-ideas/shots2-log.json
