# BELIN Collaboration App: Full Context Handoff

Written 2026-07-17. This document carries the complete context of the founding brainstorming session (held in the Belin 1.0.0 repo) into this new repository. Any new Claude session in this repo must read this file first, together with CLAUDE.md and DECISIONS.md.

---

## 1. Who the founder is and how to work with them

- Non-developer founder. Co-runs AVESOL, a solar installation subcontractor working for EPCs in Germany, Austria and Slovenia. Deep firsthand knowledge of the EPC-subcontractor process.
- Explain every important technical decision in plain language, in a few sentences, before acting on it.
- Work in phases with hard stops. When a phase says STOP, stop and wait for a go.
- Plan before code. Small steps. Commit often with clear messages.
- Ask before anything destructive, costly, or hard to reverse.
- Never use em dashes or en dashes in any produced text: UI copy, docs, emails, PDFs, chat. Use commas, colons, periods. Regular hyphens in compound words are fine.
- Maintain CLAUDE.md (stack, conventions, product summary) and DECISIONS.md (every significant decision, one line of reasoning, date) as living documents.

## 2. Strategy

Belin 1.0.0 (C:\DevEnv\Belin 1.0.0) was an attempt at a full solar CRM plus B2B subcontracting marketplace. Strategy changed in July 2026: it is now read-only reference material, never to be modified.

The first shipped product is this app: a focused collaboration tool between solar EPCs and their installation subcontractors. Sales motion: call EPCs, sell relation management with their subs (project planning, execution, progress logging, compliance, legal paper trail). EPC pays a flat monthly price, subcontractors ride free forever with unlimited users.

Later upsells, in rough order: CRM (from Belin 1.0.0 concepts), lead generation, a materials marketplace tied to the active project, subcontractor matching. End state: the full Belin platform, sold into an existing customer base instead of cold.

The subcontractor side is the strategic bridge: a sub's compliance documents live in the app as a reusable passport presented to every EPC they work for. Every new EPC makes the app more valuable to subs, every sub becomes a warm lead for the future marketplace. No competitor has this because in their tools the sub is a guest in the GC's account.

## 3. Product spec (v1)

Design law, highest priority: the subcontractor side must never feel like extra work. Subs enter, EPC approves. Every crew action completable in 30 seconds or less, one-handed, on a phone, on a roof. When in doubt, remove a field.

Second law, added by the founder: make it stupidly easy for the EPC too. Zero manual data entry wherever possible. The EPC uploads the plan PDF (from K2 Base or similar) and the app extracts the project facts automatically (kWp, module count and type, mounting system, roof type, address). EPC reviews and edits, never types from scratch. The original plan pages are shown to the sub as-is, because crews mostly need the layout drawing. A full interactive plan viewer stays out of v1.

Users and roles:
- Organizations (companies) with members and roles inside them. EPC side: CEO or admin (dashboard, billing), project lead (Bauleiter: approves, sees status, gets reports). Sub side: company owner, crew member. A future marketing role will get CRM access when that upsell ships.
- EPC side is desktop-first web dashboard. Sub side is mobile-first PWA, onboarded via link, zero training. Include an Add to Home Screen guide for iOS (links from chat apps must be routed to Safari to install).

The five modules of v1, in build order:
1. Projects and parties: EPC creates a project (PDF upload plus auto-extraction), invites a sub company via link, sub owner invites crew via link.
2. Compliance vault: documents per company and per worker: A1 certificates, Freistellungsbescheinigung, Unbedenklichkeitsbescheinigungen, ID, qualifications; for Austria HFU list status and ZKO notification fields. Every document has expiry date, traffic-light status, automatic email reminders. Sub uploads and owns; EPC sees validity and downloads what it is entitled to.
3. Daily log: crew posts photos, short note, headcount, weather in under 30 seconds. Auto-compiles into a per-project Bautagebuch, exportable as clean PDF. Crew gets a daily 17:00 reminder (email, not web push; push is unreliable on iOS in the EU).
4. Regiestunden: crew submits hour sheet, EPC countersigns digitally. Visible countdown of 6 working days from submission on the EPC side; if the window passes, mark the sheet "gilt nach § 15 VOB/B als anerkannt". Hourly work requires a prior approval flag on the project.
5. Nachträge and Abnahme: change requests with photos submitted before extra work starts, approved or rejected in-app; Abnahme flow with defect list, finger-drawn signatures on canvas, and an auto-generated completion report PDF (compiled log, approved hours, approved changes, document index).

Notifications: email for approvals, deadlines, expiries. PDFs: clean, Belin-branded, German-language (Bautagebuch, Regiebericht, Nachtrag, Abnahmeprotokoll, completion report). Offline: photo and hour capture queue locally, sync on next open, never lose a crew entry.

Non-goals for v1: chat, scheduling, interactive plan viewer, invoicing, marketplace features, native app store builds.

Legal mechanics to model as product features (with a visible disclaimer: Belin provides documentation tooling, not legal advice):
- Germany: § 15 VOB/B (6 working days countersigning or deemed accepted), § 2 Abs. 10 VOB/B (hourly work agreed before start, hence the pre-approval gate), Bauabzugsteuer (15 percent withholding without valid Freistellungsbescheinigung), A1 certificates available on site.
- Austria: Auftraggeberhaftung up to 25 percent of contract sum if sub not on HFU list (40 percent for labor leasing since 2026), LSD-BG wage documents and A1 on site. The Auftraggeberhaftung scope was expanded in 2026, which strengthens the pitch.
- Slovenia: state eGraditev push, electronic construction diaries mandatory by 2029.

Quality bar: mobile-first, thumb-reachable, readable in direct sunlight (large buttons, high contrast), German UI first with all strings through i18n keys from day one (Slovenian and English later), EU data hosting, fast on weak rural LTE, boring reliable technology.

## 4. The pilot constraint

A real project starts 22.07.2026 with a German EPC, in Germany. AVESOL acts as the subcontractor. The founder wants to test the app on this project if possible. Plan a brutally minimal slice for the start date while designing the foundation for the full vision. Candidate minimal slice: crew-side daily log input (photos, note, headcount) plus an EPC-facing read-only project dashboard via tokenized link, closely modeled on the AVE-DC Poljubinj dashboard which already implements exactly that pattern.

## 5. Belin 1.0.0 audit summary (what to harvest, what to leave)

Full audit was performed 2026-07-17. Belin 1.0.0 is React 19 + Vite 6 + TypeScript + Tailwind 3.4 + Supabase (Postgres, Auth, Storage) + Vercel serverless api/ routes + Resend email + Stripe, plus a separate Next.js landing app in landing/.

Harvest (as reference or copy):
- API hardening patterns: api/_shared/* (auth, cors, csrf, rateLimit, sanitize, validate, notify). Reference quality.
- Cooperation schema as reference: supabase/migrations/006 to 010 (account types, project_invitations, subcontractor_assignments, reviews, proposals, wholesalers, notifications).
- Resend transactional email setup, in-app notifications table plus NotificationBell pattern.
- Supabase Storage private bucket upload patterns (services/fileStorage.ts, components/DocumentUploader.tsx, SecureFile.tsx).
- PDF parsing experience: services/pdfParser.ts (pdfjs-dist plus Gemini structured extraction), relevant to the plan-PDF auto-extraction feature.
- Domain knowledge in supabase/seed-demo-account.sql (realistic German solar company data, real hardware names) and BELIN_PROJECT_SUMMARY.md.

Leave behind:
- The CRM (roughly 60 percent of page code: Workers, Contacts, Projects, Expenses, Transactions, Leads, Dashboard, Calendar).
- services/storage.ts (1,400 lines, dual localStorage/Supabase backend, legacy from an Electron era).
- State-based routing (no URL router, cannot deep-link invite links), no org/teams layer (one user equals one company), no PWA, no i18n, no magic links, no PDF generation. All must be built fresh here.
- 522MB release/ Electron artifacts, debug migrations, stale README.

Why a new repo won: the new app needs router, organizations with members and roles, PWA, i18n and PDF generation from the first commit, none of which exist there, and would drag 60 percent dead weight along.

## 6. Visual identity: AVE-DC

Source: C:\DevEnv\AVE-DC, specifically the Next.js app in dashboard/ (the Poljubinj project dashboard, "Sončna elektrarna Poljubinj", 819 kW).

- Design tokens: dashboard/app/globals.css (locked design system, ported from tolmin-dashboard.html at repo root). Light, flat, white cards on #f5f6f8, navy ink #0a1628, blue accent #2b7de9, green #1fb83a, amber #f59e0b, blue-to-navy hero gradient. Inter Variable for text, JetBrains Mono for data. Heavy weights, tight letter-spacing, uppercase micro-labels. Large radii (cards 22px, hero 28px, pills 100px), soft lifted shadows, sticky glass nav.
- Harvestable components: components/dashboard-view.tsx (hero, status banner, top stats, conic-gradient quality donut, SVG cumulative mini-chart, 28-segment dots progress bar, animated timeline with pulsing now-dot, weekly log table, photo gallery with lightbox, download CTA), recent-week-card.tsx, photo-gallery.tsx, lib/weather/ (live Open-Meteo integration), @react-pdf/renderer already in use for PDF export.
- Access pattern worth copying: magic-link style tokenized project routes, app/p/[slugToken]/page.tsx.
- Founder's direction: take almost the entire visual identity from this, then push design, animation and responsiveness much further. The app must look elite and appropriate for 2026 Q3.

## 7. Market research summary (July 2026)

No product anywhere combines solar-specific field workflow, two-sided EPC-sub collaboration, and German legal mechanics.

- Bautagebuch and construction PM apps (Capmo, PlanRadar, Craftnote, 123erfasst, Fieldwire, upmesh) and compliance vaults (Tenera, Bausicht, Cosuno, Freistellungsmanager) are two disjoint categories. EPCs run 2 or 3 tools plus WhatsApp and Excel.
- Nobody implements the § 15 VOB/B 6-working-day deemed-acceptance clock as a product feature. Vendors only blog about it. Same for chaining Nachtrag pre-approval into Abnahme. This is the sharpest differentiator and the best cold-call story.
- Closest generic competitor: Capmo (two-sided, free subs, Nachtragsprüfung, but generic construction, no solar, no VOB clock, no compliance vault). Closest solar competitor: TabTool PV (German, solar Bautagebuch, but utility-scale parks, not the resi/commercial EPC-with-montage-crews segment).
- Austria and Slovenia are white space: HFU list checks and ZKO notifications are manual government portals with no SaaS on top.
- Pricing anchors: free sub seats are a proven model (PlanRadar, Capmo, Fieldwire). Freistellungsmanager charges 29 to 249 EUR per month to track one certificate type. PlanRadar runs 26 to 129 EUR per user per month. A bundled solar sub-compliance plus documentation tool can price above generic Bautagebuch apps (15 to 30 EUR per seat).
- US solar ops tools (Scoop, Coperniq, Sitetracker, Zuper) are EPC-internal, US-shaped, not competitors in DACH.

## 8. Legal and data protection approach (agreed direction, not legal advice)

The app stores personal data (A1 certificates, ID copies, qualifications, hour sheets, signatures, site photos). This is the same data category that Tenera, Bausicht and Personio store; there is no fundamental blocker. The approach:
- EPC and sub companies are data controllers; Belin is the processor. Sign a standard DPA (AVV) with each customer; list subprocessors (Supabase, Vercel, Resend, any AI provider).
- EU data residency: Supabase region Frankfurt, EU-hosted services throughout.
- Strong lawful basis: the EPC is legally obligated to check these documents (Bauabzugsteuer, LSD-BG, MiLoG), so processing rests on contract performance and legal obligation.
- Access control via RLS so each party only sees what it is entitled to. Private storage buckets. Retention and deletion policy.
- AI caution: K2 Base plan PDFs contain no personal data, safe to run through AI extraction. Never send worker documents (A1, ID) through non-EU AI APIs; either skip AI there or use an EU-resident model under a DPA.
- Finger-drawn signatures are simple electronic signatures, sufficient in practice for Regieberichte and Abnahmeprotokolle (VOB/B does not require qualified signatures). Timestamped audit trail matters more than signature grade.
- Product carries a visible disclaimer: documentation tooling, not legal advice.
- Before charging customers at scale: have a lawyer review the AVV and Nutzungsbedingungen. For the pilot with one friendly EPC, a simple signed AVV and data minimization suffice.

## 9. Decisions already made

See DECISIONS.md. Highlights: new sibling repo (this one), Belin 1.0.0 read-only, AVE-DC visual identity upgraded, organizations with internal roles (CEO, Bauleiter, owner, crew, later marketing), zero-manual-entry principle for the EPC, PDF auto-extraction in v1 but no interactive plan viewer, pilot target 22.07.

## 10. Where the conversation left off

Brainstorming phase, not yet at an approved design document. Open items in order:
1. Confirm the minimal pilot slice for 22.07 (proposal: crew daily-log input plus EPC read-only tokenized dashboard, built on AVE-DC patterns).
2. Choose the stack for this repo (leading candidate: Next.js like AVE-DC dashboard, since the visual system and PDF rendering already live there, with Supabase EU as backend).
3. Produce the design doc (docs/superpowers/specs/), get founder approval, then write the implementation plan, then build milestone M1.
