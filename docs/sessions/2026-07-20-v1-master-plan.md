# Session 2026-07-20: the eight decisions closed, v1 master plan authored

## What the founder asked

Close the eight open decisions from the 2026-07-19 design record (with a research
mandate on the diary signature question: "make sure"), reorder priorities (K2
step 2, notifications step 3, incidents step 4, naročilnica anchor step 5, VAT
finesse moved to the end, landing page proper and expanded, ad after 26.07),
and plan the entire phase without executing.

## Done

- Researched the Slovenian signature question to ground truth: an on-screen
  signature is a simple e-signature and cannot make the app the statutory
  gradbeni dnevnik (Pravilnik o gradbiščih art. 10(4) demands lastnoročni
  podpis on duplicate paper sheets; the replacement Uredba is still a draft;
  eIDAS art. 25(2) reserves handwritten equivalence for qualified signatures).
  Positioning stays "dnevno poročilo podizvajalca". Bonus finding: most
  Slovenian rooftop PV needs no statutory diary at all (no gradbeno dovoljenje).
- Confirmed Regiestunden (and change orders, acceptances, requests) have FULL
  schema and ZERO app code; both are in the plan.
- Ran three recon agents (app routes and data layer, schema gaps, AVE-DC PDF
  engine) and wrote the master plan from verified facts:
  docs/superpowers/plans/2026-07-20-v1-master-plan.md. 27 tasks, 9 parts,
  4 drafted migrations, all data shapes, vikanje Slovenian copy, milestone
  calendar to Sunday 26.07 evening.
- Ran the four adversarial review lenses (data integrity, security, UX and
  design laws, cold-start executability): 72 findings, 9 blockers, all folded.
- Updated DECISIONS.md (decisions closed plus the plan record) and CHANGELOG.md.

## Learned (the load-bearing facts)

- Review lenses earn their cost again: the blockers included crew logins
  reaching org IBAN settings, email scanners burning single-use magic links on
  GET, the notification engine consumed a part before it existed, staged demo
  rows referencing PDFs nothing could generate, an unreachable PO acceptance
  page, and a missing navigation model for every new route.
- The plans storage bucket only allows application/pdf; the wizard's xlsx path
  needs the allowlist widened in M2.
- The existing catalog register is vikanje; new copy drafted in tikanje had to
  be normalized. German inherits Sie at the translation pass.
- The dash sweep one-liner cannot contain literal dash characters if it is
  written INTO a swept file; use \u escapes.

## Failed

Nothing failed. One connection drop mid-session; the plan write resumed clean.

## Succeeded

The full phase is planned in one session with every review folded, and the
founder's priority order was reconciled with hard dependencies explicitly
(C3 after D1, which the founder's own ordering implied anyway).

## Next

1. Founder reads the plan summary and vetoes any of the 19 defaults.
2. Execution by Opus in a fresh session, task by task, starting with Part A
   (K2 parser core). Deadlines unchanged: v1 done 26.07 evening, German EPC
   starts 27.07.
