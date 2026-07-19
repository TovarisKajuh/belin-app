# Design record: ship the entire v1, demo is the staged product

Status: brainstorm and research record, 2026-07-19 late evening. Decisions below are PROPOSALS with defaults; the founder decides all points later, before execution. This document carries the full discussion so the next session starts from here, not from zero.

## The founder's reframe (the governing idea)

We are not building a PoC anymore. We ship the ENTIRE product. The "demo" is the full product populated with fake data for specific phases of an imaginary project, phase 1 to phase 4:

1. Onboarding and project start: EPC uploads the K2 plan and contract, the app parses it into the material list, install plan and location, roles and instructions distribute themselves; naročilnica is auto-prepared; the sub is prompted to upload A1 and certificates and accept the naročilnica at the agreed price; sub checks the Stückliste, first-day photos and logs.
2. Mid-project: EPC watches progress; sub requests additional materials; sub logs Regiestunden and the EPC approves or rejects; incidents and rainy days are reported.
3. Finalization: sub requests finalization; the FULL Bautagesbericht (entire report with photos and stages) is prepared; EPC approves, downloads the standardized document; an invoice is auto-generated; a share button sends it to the accountant email set in settings.
4. Portfolio: the EPC's dashboard across ongoing and past projects, graphs, charts, key data.

Functions the founder listed as needed: K2 plan parse and interpret; generate naročilnica, final report, Bautagesbericht/gradbeni dnevnik, proper-format invoice; live sync (SHIPPED 2026-07-19); proper translations; visual polish; a vastly better landing page; notifications; settings (accountant email etc.); and a spectacular screen-capture video ad with animations and transitions (roof filming later).

## Research findings (grounded 2026-07-19, four agents, sources in agent reports)

### K2 Base ingest: deterministic parsing is feasible, high confidence

- K2 Base exports: PDF project report, article list as Excel, DXF/DWG, plus partner hand-offs. No public API; file upload is the only realistic channel.
- The PDF is TRUE TEXT (no OCR), structure stable across engine versions 3.1 and 3.2. Article list columns exactly: Position, Art-Nr., Artikel, Anzahl, Gewicht; 7-digit numeric article numbers; per-roof tables plus a project total.
- Every page footer carries "K2 Base Report <version> | <date> | <project>", a perfect fingerprint for detection and parser versioning.
- Rich label-value metadata parses out: address, wind and snow zones, roof type and pitch, module maker, model, Wp, count, kWp per roof and total.
- CAVEATS: the article list is an OPTIONAL report section (two of four real samples lacked it), so the upload flow must accept the Excel parts list too and must tell the EPC to export with the article list; extraction quirks to normalize: stray spaces inside numbers, German decimal commas, multi-line cells; reports exist in other UI languages.
- Design: vendor adapters behind one normalized shape (line items: article_no, name, qty, weight; metadata dict), K2 adapter first; an LLM fallback is a LATER generic adapter (Schletter, Renusol, Aerocompact, Van der Valk emit the same genre with different layouts).
- Five real K2 PDFs saved for parser development: tests/fixtures/k2/ (two engine versions, K2's annotated statics report, two forum reports). Get one fresh export from the pilot EPC before hardening.

### Documents: field lists and honest positioning

- Bautagesbericht (DE/AT): no statutory form; contractual duty plus evidentiary best practice. Day entry fields: project and report number (SEQUENTIAL, NO GAPS, courts check this), date, author and role, timestamp; weather morning and midday with temperatures (courts benchmark against official weather data, and Belin already auto-fetches weather per report, a genuine legal selling point); crew count and roles and hours; work performed with precise location and quantities; deliveries with delivery note numbers; equipment; incidents (Behinderungen), interruptions, accidents; instructions received; photos timestamped; foreman signature, ideally EPC countersignature. A daily report does NOT replace the formal Behinderungsanzeige under 6(1) VOB/B; the app should let the sub flag one (v1 flags and notifies; a later version generates the notice letter).
- Slovenian gradbeni dnevnik: statutory, prescribed form (Pravilnik o gradbiščih, Priloga 1, under GZ-1), requires daily countersignature by the nadzornik, whom Belin's sub-side cannot capture. POSITIONING FOR V1: in Slovenia the generated diary is contractual site documentation mirroring the statutory fields ("dnevno poročilo podizvajalca"), never a claimed statutory gradbeni dnevnik. Germany and Austria: standard practice is the product.
- Abnahmeprotokoll (VOB/B 12): parties and representatives, date and attendees, scope (whole or partial), type, defects each with precise description, location, photo annex reference and remediation deadline, agreed versus disputed, Restarbeiten with dates, declaration (accepted, with reservations, refused), EXPRESS RESERVATION OF CONTRACTUAL PENALTY (the field lawyers check first; must be a template field, not free text), warranty start and duration, both signatures. Legal effect: risk transfer, burden of proof reversal, limitation start, final invoice due. Fictitious acceptance timelines exist (12 working days after completion notice).
- Completion report structure: cover, project summary with final quantities, progress timeline, all day reports indexed, photo documentation, material and delivery documentation, hour sheets with approval status, change order register, defect and incident register, acceptance protocol annex, numbered document index. Retain through warranty (5 years guidance).

### Invoicing and naročilnica

- Place of supply for installation on a building: where the building stands. The pilot pairs are ALL reverse charge: SI sub to DE EPC (13b UStG, note "Steuerschuldnerschaft des Leistungsempfängers"), SI sub to AT EPC (19 öUStG, "Übergang der Steuerschuld auf den Leistungsempfänger"), SI sub to SI EPC for construction services (76.a ZDDV-1, "Obrnjena davčna obveznost po 76.a členu ZDDV-1", supplier also reports PD-O). DE sub to DE EPC: reverse charge only if the EPC qualifies (USt 1 TG), else normal 19 percent.
- One field set covers SI and DE (both transpose Art. 226): issue date; sequential invoice number; supplier name, address, VAT id; customer name, address, VAT ID (mandatory under reverse charge); service description and project site address; performance date or period; net amounts and unit prices; VAT rate and amount EXCEPT reverse charge (then net only, and the template must PHYSICALLY PREVENT printing VAT in that mode, wrong VAT shown creates 14c liability); the reverse charge note; currency, due date, IBAN.
- VAT treatment is a per-project SETTING defaulted by country pair, confirmed by the user's accountant. Never hardcoded advice.
- German trap worth productizing: Bauabzugsteuer, 15 percent withholding on construction payments unless the sub presents a Freistellungsbescheinigung. The vault schema ALREADY has that document type; surface it next to the A1.
- Naročilnica: form-free B2B; proper fields: parties with VAT ids, PO number, date, project and site, itemized scope, price, currency, price type, payment terms, deadline, place of performance, acceptance block. In-app accept is a valid simple e-signature (eIDAS art. 25); strengthen with named authenticated acceptor, server timestamp, immutable snapshot and HASH of the exact accepted PDF, confirmation email to both sides.
- Accountant hand-off: email PDF is the v1-correct channel everywhere (DE norm is DATEV Unternehmen online with a per-client upload email address, which is exactly what the accountant-email setting holds). E-invoice mandates (DE domestic phasing to 2028, SI e-SLOG B2B from 1.1.2028) do not bind the cross-border pilot case; plan e-SLOG and ZUGFeRD exports before 2028.

## Repo recon: what exists versus what is missing

EXISTS (schema-only, zero app code, from the day-one schema): hour_sheets with deadline_at for the 15 VOB/B clock plus hour_sheet_lines; change_orders plus photos; acceptances (with report_pdf_path slot) plus acceptance_defects; documents vault with types including a1 and freistellungsbescheinigung, plus document_reminders (a sent-log, not a scheduler); invites; requests (types material, plan, instruction only, single photo); generated_documents (kinds bautagebuch, regiebericht, nachtrag, abnahmeprotokoll, completion_report; NO invoice kind); people.auth_user_id ready for Supabase auth; storage buckets photos, plans, docs, signatures, reports all provisioned; projects.plan_pdf_path exists. Resend API key provisioned AND the sending domain getbelin.com already verified; no send code yet. Live sync shipped. PDF engine pattern to port: @react-pdf/renderer lives in C:\DevEnv\AVE-DC\dashboard (NOT the AVE-DC root), see dashboard/lib/pdf/consolidated-document.tsx and weekly-document.tsx plus its pdf route handlers.

MISSING: organizations columns vat_id, iban, logo, accountant_email; an orders (naročilnica) table; an invoices table; a project price anchor (proposal: price lives on the naročilnica); an incidents table (requests cannot express incidents or rain); notification preferences and log tables; web push anything (no service worker); org-scoped actor and any project-list view (everything is one-project-per-token today; org FK indexes exist).

i18n placeholder debt precisely: landing (all), auth (all), crew.material subsection, dashboard.material plus tempo subsections. Everything else is translated.

## Additions proposed (beyond the founder's list)

1. The QR moment in the live demo: prospect scans, lands in the crew view on their own phone, submits, watches the wall dashboard update live. Uses only existing token links plus live sync.
2. Freistellungsbescheinigung surfaced in the vault next to A1.
3. Sequential day-report numbering, no gaps (evidentiary, near-free).
4. Obstruction (Behinderung) incident kind alongside incident and rain stop; v1 flags and notifies, later generates the formal notice.
5. End-of-day EPC email digest (cut-line candidate).
6. Parking lot (post-v1, recorded not built): Abschlagsrechnung progress-based partial invoicing; auto-generated Behinderungsanzeige letters; DATEV hand-off; e-SLOG and ZUGFeRD (2028 mandates); offline queue; planner adapters beyond K2; web push.

## The ad storyboard (screen capture v1, produce after the build)

Sixty seconds, sound-off friendly, Slovenian first. 1) Hook 0-5s: paper, calls, Excel chaos, "Papirji. Klici. Kaos." 2) The drop 5-15s: K2 PDF drags in, the Stückliste types itself, map pin, plan appears, "Naloži načrt. Belin naredi ostalo." (hero shot). 3) Day loop 15-30s: split screen, thumb taps and photo left, dashboard pulses and tempo curve grows right, "30 sekund na dan." 4) Truth moments 30-42s: rain day logged, missing material caught day one, Regiestunden clock ticks to approved, "Vsaka ura. Vsak zaplet. Zapisano." 5) Finale 42-55s: "Zaključi projekt", report pages cascade, invoice generates, one tap to the accountant, "Papirologija? Narejena." 6) Outro 55-60s: portfolio zoom-out, the gold mark builds (the splash IS the logo animation), "Belin. Gradbišče v žepu.", getbelin.com. Production: three-stage demo seeds, record staged real app runs, edit with transitions; the app's own animations carry the visual weight; Remotion is a later option for pixel-perfect motion.

## Decomposition into work packages (dependency order)

- WP1 Auth and accounts: magic-link login, orgs, invites (EPC invites sub, sub invites crew), org-scoped session actor (the resolveActorFromSession seam is ready), settings page (company data, accountant email, VAT mode, notification prefs), basic project list. Unblocks everything; required for the German EPC on 27.07.
- WP2 Onboarding and parse: project wizard, K2 upload (PDF and XLSX) with extraction review-and-edit screen, naročilnica generation and in-app acceptance (hash, timestamp, named acceptor), PDF engine bootstrap ported from AVE-DC/dashboard.
- WP3 Vault, requests, incidents, notifications: A1 and certificates with expiry traffic lights, material requests, incidents and rain and obstruction, Resend email notifications on key events plus in-app.
- WP4 Regiestunden: sheets, the visible six-working-day countdown, approve or reject, deemed-approved marking, notification hooks.
- WP5 Finalization: request finalization, full Bautagesbericht day pages plus completion report assembly, acceptance flow with the penalty-reservation field, invoice generation and share-to-accountant.
- WP6 Polish and launch: portfolio dashboard, landing page rebuild, the single translation pass of the known debt plus new strings, three-stage demo seeds (phases 1 to 4 of the imaginary project), security cleanup (rotate service role key, replace demo login with real auth, DEV pill), rehearsal, runbook v2 with the QR moment.

Cut order if time runs short: email digest first, then portfolio charts (keep the plain list), then incidents shrink to a note kind, then the landing ships one hero section.

## OPEN DECISIONS, all deferred by the founder (proposals with defaults, decide before execution)

1. Slovenia diary positioning: contractual documentation mirroring the statutory form (default) versus attempting statutory compliance.
2. VAT: per-project setting defaulted by country pair, accountant confirms (default) versus fixed per market.
3. K2 parsing: deterministic plus review screen only in v1 (default) versus including an LLM fallback now.
4. Notifications v1: email plus in-app (default); web push post-v1.
5. Incidents: own table with kinds incident, rain stop, obstruction, multi-photo (default) versus extending requests.
6. Contract anchor: price lives on the naročilnica; invoice composes from it plus approved Regiestunden plus approved change orders (default).
7. Landing page and translations land at week's end so screenshots show the final product and translation happens once (default) versus earlier.
8. Ad ships after 26.07, storyboarded now (default).

## Next steps

1. Founder decides the open points (or approves defaults).
2. Writing-plans pass: per-WP implementation plans in the proven style (recon-cited file references, data shapes first, per-task verification steps, environment traps).
3. Opus executes WP by WP with the established rituals.
