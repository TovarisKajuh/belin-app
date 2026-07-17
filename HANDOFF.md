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

Additional sub-side mechanics decided 2026-07-17 (founder additions):
- Progress by quantities: each project has scope items (name, target quantity, unit, weight). Crew logs installed quantities daily ("100 von 500 Modulen"). Percent complete is the weighted sum, computed, never estimated. This later powers installment-payment documentation (Abschlagsrechnung under § 16 VOB/B and § 632a BGB): photo-backed, quantity-based progress statements. Founder note: nothing like this exists in the market.
- Stückliste check as a required gate: the EPC provides the material list per project; when the crew first arrives on site they must walk the list and confirm complete or mark missing items. The EPC is automatically notified either way. Crew cannot start daily logging before the check.
- Requests: the sub can request additional materials, plans, or instructions from the EPC (type, short text, optional photo), which lands in the EPC activity feed.
- Field conveniences: project address has an "In Google Maps öffnen" button. More small crew conveniences of this kind are an open brainstorming category.

Non-goals for v1: chat, scheduling, interactive plan viewer, invoicing, marketplace features, native app store builds.

Legal mechanics to model as product features (with a visible disclaimer: Belin provides documentation tooling, not legal advice):
- Germany: § 15 VOB/B (6 working days countersigning or deemed accepted), § 2 Abs. 10 VOB/B (hourly work agreed before start, hence the pre-approval gate), Bauabzugsteuer (15 percent withholding without valid Freistellungsbescheinigung), A1 certificates available on site.
- Austria: Auftraggeberhaftung up to 25 percent of contract sum if sub not on HFU list (40 percent for labor leasing since 2026), LSD-BG wage documents and A1 on site. The Auftraggeberhaftung scope was expanded in 2026, which strengthens the pitch.
- Slovenia: state eGraditev push, electronic construction diaries mandatory by 2029.

Quality bar: mobile-first, thumb-reachable, readable in direct sunlight (large buttons, high contrast), UI in Slovenian, German and English from the first commit with all strings through i18n keys (decided 2026-07-17 evening; originally German first), EU data hosting, fast on weak rural LTE, boring reliable technology.

## 4. The two deadlines (updated 2026-07-17 evening, replaces the original version)

1. **Demo on Monday 20.07.2026** at a Slovenian meeting with a local Slovenian EPC, a potential customer. Demo UI language: Slovenian. No auth or invites needed: the two founders demonstrate the whole EPC-sub process live, each on their own device (sub role on an installed PWA phone, EPC role on a laptop), connected through two tokenized links into one seeded demo project (a realistic Slovenian commercial roof). Approved design: docs/specs/2026-07-17-monday-demo-design.md including its update note.
2. **The German EPC tests the full v1 with real accounts from Monday 27.07.2026** (this replaces the earlier plan of a 22.07 pilot start), with AVESOL as the subcontractor on the real project. Full v1 means magic-link auth, organizations with roles, invite links and all five modules, finished and rehearsed by Sunday 26.07 evening. Everything built for the Slovenian demo is the real product foundation, not a throwaway. Build order: docs/specs/2026-07-17-v1-build-order.md.

Calendar note: 17.07.2026 is a Friday. The pre-demo build window is Friday evening, Saturday 18.07 and Sunday 19.07.

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

## 10. Where the conversation left off (updated 2026-07-17 evening, scope and build-order session)

The second session corrected the timeline and set the build discipline. The Monday 20.07 demo is in Slovenian for a Slovenian EPC prospect. The German EPC tests the full v1 with accounts from 27.07, so all of v1 must be done by Sunday 26.07 evening. UI is trilingual (sl, de, en) from the first commit. The build order was analyzed and decided with full articulation in docs/specs/2026-07-17-v1-build-order.md: foundations and external clocks first (Friday evening), demo spine with risk-first spikes (Saturday), demo surface complete plus 18:00 dry run with pivot rule (Sunday), then accounts, compliance vault, Regiestunden, Nachträge and Abnahme in lifecycle order through the week, PDF extraction as parallel filler, full rehearsal Sunday 26.07. A working discipline and logging system is now mandatory: see CLAUDE.md (Working discipline), CHANGELOG.md and docs/sessions/.

Next steps for the next session, in order:
1. Session start ritual: read CLAUDE.md, DECISIONS.md, recent CHANGELOG.md and the latest log in docs/sessions/.
2. Write the implementation plan for phases 0 to 2 (use the superpowers writing-plans skill), get founder approval.
3. Execute phase 0 (provision Supabase Frankfurt, Vercel, Resend DNS; scaffold; full schema; deployed walking skeleton). Hard stop for founder review after each phase.
