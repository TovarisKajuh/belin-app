# Design: Monday Demo (20.07.2026)

Status: approved by founder on 2026-07-17, with additions (material check, requests, maps button) folded in.

## Goal

A live demo on Monday 20.07 in front of a potential customer (a German EPC). The two founders play both roles on their own devices: one acts as the sub crew on a phone (installed PWA), one as the EPC on a laptop or tablet. No auth, no invites: two tokenized links into the same demo project. A real pilot project starts 22.07 with AVESOL as subcontractor; everything built for the demo is the real foundation, not a throwaway.

## Design laws (apply to every screen)

1. Sub side: every action under 30 seconds, one-handed, on a phone, on a roof. When in doubt, remove a field.
2. EPC side: zero manual data entry wherever possible. The EPC reviews, approves, reads. It never types from scratch.
3. Elite 2026-Q3 visual quality on the AVE-DC token system, pushed further.
4. German UI, all strings through i18n keys from day one. EU hosting. Fast on weak rural LTE.

## The two views

### Sub view (mobile-first PWA, German)

- **Tagesbericht flow (the core):** tap camera, take progress photos, one-line note, headcount stepper, today's quantities per scope item ("Module montiert heute: 100 von 500", "Schienen: 120 von 480"). Weather auto-filled from site location (Open-Meteo, pattern exists in AVE-DC). Submit. Target: under 30 seconds.
- **Stückliste check (required first-visit step):** the EPC provides the material list per project. When the crew first arrives on site (and on material deliveries), the app requires them to walk the list and either confirm everything is present or mark missing items with quantities. Submitting triggers an automatic EPC notification: "Sub bestätigt: vollständige Materialliste vor Ort" or "Sub meldet fehlendes Material: ...". This is a gate, not an optional feature: the crew cannot start daily logging before the check is done.
- **Requests:** the sub can request additional materials, plans, or instructions from the EPC. Lightweight: pick a type (Material, Plan, Anweisung), short text, optional photo. Appears in the EPC activity feed. If Monday time runs short, this is the first feature to slip to pilot week; the Stückliste check stays.
- **Project info screen:** address with an "In Google Maps öffnen" button, plan PDF viewable as-is, contacts, scope overview.
- **Simulated 17:00 reminder screen:** demonstrates the daily prompt in the pitch (real scheduled emails come after auth exists).

### EPC view (desktop-first dashboard)

Rebuilt from the AVE-DC Poljubinj dashboard on the new design system:

- Hero with project facts, big computed progress percentage with the weighted scope breakdown.
- Cumulative progress chart (SVG, harvested from AVE-DC), timeline, daily log feed, photo gallery with lightbox.
- Activity feed with notifications: Stückliste confirmation or missing-material alert, new daily entries, requests.
- Live updates: an entry submitted on the phone appears on the EPC screen within seconds (Supabase Realtime). This is the demo moment.
- **PDF export:** one clean, Belin-branded, German Bautagebuch PDF of the log so far (@react-pdf/renderer, pattern harvested from AVE-DC).

## Progress model (the founder's differentiator)

Each project has scope items: name, target quantity, unit, weight (share of total work, defaults provided, EPC-editable). Daily entries log installed quantities per item. Project percent complete is the weighted sum, computed, never estimated. This later powers installment-payment documentation (Abschlagsrechnung under § 16 VOB/B and § 632a BGB): a photo-backed, quantity-based progress statement instead of "roughly half done" on the phone. For the demo: two or three scope items (Unterkonstruktion, Module, optional DC-Verkabelung).

## Data model (plain words, real from day one)

- organizations (EPC company, sub company)
- projects (belongs to EPC org, assigned sub org, address with coordinates, plan PDF file, pre-approval flags for later modules)
- project_tokens (token, role: epc or sub; stands in for auth until M1)
- scope_items (project, name, unit, target_qty, weight)
- daily_entries (project, date, note, headcount, weather snapshot) and entry_quantities (entry, scope_item, qty) and entry_photos (storage refs)
- material_list_items (project, name, qty, unit) and material_checks (entry per check: complete yes/no, missing items with quantities, timestamp)
- requests (project, type: material/plan/instruction, text, photo, status)
- activity (the notification feed rows the EPC sees)

## Stack

Next.js App Router (same as AVE-DC dashboard, so the visual system transfers directly), Supabase Frankfurt (Postgres, Storage, Realtime), Vercel hosting with a live URL, PWA manifest plus install guide, i18n with German first. Resend email joins after the demo.

## Real vs staged on Monday

Real: data model, design system, German i18n, EU hosting, live sync, PWA install, PDF export, deployed URL. Staged: no auth (tokens), reminder simulated, seeded demo project (realistic German commercial roof, real hardware names from the Belin 1.0.0 seed data).

## Out of scope for Monday

Hour sheets (Regiestunden), compliance vault, Nachträge, Abnahme, signatures, offline queueing, PDF plan auto-extraction, email notifications, auth and invites. All stay in the v1 module plan (HANDOFF.md section 3).

## Suggested build order (Fri 18. to Sun 19., demo Mon 20.)

1. Friday: scaffold Next.js app, Supabase schema, harvest AVE-DC tokens into the design system, sub Tagesbericht flow end to end (photos to storage, entry saved).
2. Saturday: EPC dashboard with live updates, progress computation, gallery, activity feed, Stückliste check flow.
3. Sunday: seed script, PDF export, Google Maps button, project info screen, simulated reminder, polish, deploy, PWA install test on both phones, dry run of the full demo script.

Must-haves: Tagesbericht, EPC dashboard with live progress, Stückliste check, seed, deploy, PWA install. Nice-to-haves in order: PDF export, requests flow, reminder screen, animation polish.

## After Monday

Swap the seed for the real 22.07 project data and use it on site (tokens are fine for a one-project pilot). Then M1: magic-link auth, organizations with member roles, invite links, replacing tokens. Then the remaining v1 modules in order (compliance vault, Regiestunden, Nachträge and Abnahme).
