# Session 2026-07-19 (fifth): the v1 reframe, research, and design record

## What the founder asked

Study the full v1 vision (4-phase demo arc, K2 parsing, naročilnica, Regiestunden,
incidents and rain, Bautagesbericht plus auto-invoice with accountant share,
portfolio dashboard, landing page, notifications, settings, translations, video
ad), brainstorm additions, and create proper plans after the discussion.

Mid-session reframe, the governing decision of the session: **we are not
building a PoC anymore, we ship the ENTIRE product; the demo is the full
product populated with fake data at four phases of an imaginary project.**

## Done

- Ran the brainstorming discipline: context recon plus three web research
  agents (K2 Base exports, German and Slovenian construction documents,
  cross-border invoicing) and one deep repo recon.
- Presented the full design discussion: research findings, six work packages in
  dependency order with cut lines, eight additions, the 60-second ad
  storyboard, and eight open decisions with defaults.
- Wrote the whole record to
  docs/superpowers/specs/2026-07-19-v1-ship-everything-design.md so the next
  session starts from it. All decisions are OPEN, deferred by the founder.
- Preserved five real K2 Base report PDFs into tests/fixtures/k2/ for parser
  development before the session scratchpad evaporates.

## Learned (the load-bearing facts)

- K2 Base PDFs are deterministic-parseable: true text, stable structure, fixed
  five-column article table, 7-digit article numbers, a footer fingerprint on
  every page. The article list is an OPTIONAL section, so the flow must accept
  the Excel export too. No API exists.
- Belin's auto-fetched weather is a legal selling point: courts benchmark daily
  reports against official weather data. Sequential report numbering with no
  gaps is checked too.
- Slovenia's gradbeni dnevnik has a prescribed statutory form needing daily
  supervisor countersignature, so the generated diary is positioned there as
  contractual documentation. Germany has no prescribed form.
- Every pilot country pair is reverse charge (13b UStG, 19 öUStG, and 76.a
  ZDDV-1 even domestically in Slovenia). The invoice template must refuse to
  print VAT in reverse-charge mode. Bauabzugsteuer makes the
  Freistellungsbescheinigung a first-class vault document, and the day-one
  schema ALREADY anticipated it as a type.
- The day-one schema covers hour sheets (with the clock column), change
  orders, acceptances, vault, invites, generated documents. Missing is small:
  org settings columns, orders and invoices tables, incidents, notification
  prefs, an org-scoped actor. Resend's domain getbelin.com is already verified.
- The PDF engine to port lives in AVE-DC/dashboard, not the AVE-DC root.

## Failed

Nothing failed. One near-loss avoided: the K2 sample PDFs lived in the
session-scoped scratchpad and would have vanished; copied into the repo.

## Succeeded

The founder's questions ("what would you add, how to make it spectacular")
got grounded answers: the QR audience-participation moment, the
Freistellungsbescheinigung surfacing, sequential numbering, the obstruction
flag, the digest, and the parking lot. The reframe is logged in DECISIONS.md.

## Next

1. Founder decides the eight open points in the spec (or approves defaults).
2. Writing-plans pass produces per-WP implementation plans.
3. Opus executes WP1 through WP6 with the established rituals. Deadlines
   unchanged: v1 done 26.07 evening, German EPC starts 27.07.
