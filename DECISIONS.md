# DECISIONS.md

One line per significant decision: what, why, when.

- 2026-07-17: Build the collaboration app in a new sibling repo (this one) instead of inside Belin 1.0.0. Reason: the new app needs URL routing, an organizations-with-members model, PWA, i18n and PDF generation from day one, none of which exist there, and 60 percent of that codebase is CRM dead weight for this product.
- 2026-07-17: Belin 1.0.0 is read-only reference material. Reason: harvest deliberately (API hardening patterns, cooperation schema, email and storage patterns, domain seed data) without inheriting baggage.
- 2026-07-17: Visual identity comes from AVE-DC (Poljubinj dashboard design tokens and components), then upgraded significantly. Reason: proven, distinctive system already built for exactly this domain; founder wants elite 2026-Q3 quality.
- 2026-07-17: Companies are organizations with member roles inside them (EPC: CEO or admin, Bauleiter; sub: owner, crew; later a marketing role for the CRM upsell). Reason: multi-seat collaboration cannot work on Belin 1.0.0's one-user-equals-one-company model.
- 2026-07-17: Zero-manual-entry principle for the EPC: plan PDF upload with automatic extraction of project facts, EPC reviews and edits instead of typing. Full interactive plan viewer stays out of v1. Reason: adoption depends on the EPC not becoming busier than before.
- 2026-07-17: The § 15 VOB/B 6-working-day countersigning clock, Nachtrag pre-approval gate and compliance expiry logic are modeled as explicit product mechanics. Reason: market research shows no competitor implements them; sharpest differentiator.
- 2026-07-17: Pilot target: a real project of a German EPC starting 22.07.2026, with AVESOL as subcontractor. Plan a brutally minimal slice for that date while designing for the full vision.
- 2026-07-17: EU data residency (Supabase Frankfurt), DPA with customers, no worker personal documents through non-EU AI APIs. Reason: GDPR compliance as described in HANDOFF.md section 8.
