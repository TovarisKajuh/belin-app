# Session, 2026-10-06: demo day execution

Executing `docs/superpowers/plans/2026-10-05-demo-day-readiness.md` for the meeting with a Slovenian EPC at about 16:00. The founder said "start executing" at 08:56. The plan assumed a 23:00 start, so execution runs the "Morning cut" recorded at the top of the plan and in DECISIONS.md.

## Clock against the plan

| Time | What |
|---|---|
| 08:57 | Start. Wave 0 unanswered: defaults used (Supabase free, Resend on its cap, meeting 16:00, no personalization). getbelin.com still on the old projects; Resend getbelin.com still failed. |
| 08:58 | R0: tag demo-eve-start on e89f2de, pushed. |
| 08:59 | Task 1.1: leftovers commit 4986a17 (workflow rebuild byte-identical), plan and audit commit 1434e3a with the Morning cut. |
| 09:00 | Task 0.4 (partial): DEMO_DOOR_KEY, DEMO_DOOR_UNTIL=2026-10-13, SIGNUP_OPEN=0 set in Vercel (production, preview) through the connector, and in .env.local. |
| 09:00 to 09:33 | Morning cut lanes. A: 7.1 pushed first, then 1.2, 1.6, 1.7 (migration applied about 09:10), 5.10 minimal, 5.8 minimal, 5.6. B: 2.1a (is_demo migration applied 09:03), 2.1b, 2.2a, 2.2b. C: 2.3a, 2.3b, 2.3c. D: 6.1m part A, 3.1, 1.11, 3.3. Docs: 9.2. |
| about 09:20 | The Supabase connector started answering "FGA Authentication Error. Unauthorized" while listed as connected. No schema change is possible until the founder re-authorizes it. |
| 09:40 | Gate 1+2 merge d95fcae (543 tests, lint clean), pushed. |
| 09:41 | Reseed with the new seed: Svetlogradnja d.o.o., 100000 EUR and 40 EUR/h, Trenutno 23.09 to 05.10, hours deadline 08.10 (countdown 2), six real site photos, three sample vault PDFs, both naročilnice re-rendered. |
| 09:43 | Round 2 launched: production verification plus lanes A to E. |
| 10:00 | Lane E found the Door persona buttons answering 500 on d95fcae: `referrer: "no-referrer"` makes Chrome send `Origin: null`, which Next 15.5's action handler cannot parse. Hotfix 71d3ed9 (`same-origin`) built in a separate worktree from origin/main and pushed alone, so lane A's unmerged work did not ship with it. |
| 10:07 | Door smoke on production: all personas, switch, guest and tampered guest green. Tag gate-1-2. |
| 09:43 to 10:38 | Round 2. Verify lane: every run-of-show beat works on production, closing chain green (report 11 pages in 5 s, three-stroke signatures, invoice with every statutory field, hours 19 = 14 + 5), then reseed. Lanes: A 2.4, 3.5, 4.5d, 6.4m, 3.2; B 5.1a, 5.5, 1.5, 5.3, 5.2; C 1.9 and Wave 4 signup built but closed (migration file not applied, connector down); D 3.4, 6.1m part B, 6.6; E 5.9 (33 taps down to 15), 4.5c, 5.7. |
| 10:52 | Gate 3 merge 712835e: 659 tests, lint clean, production build green. The merger found one more missing unwrap (start final acceptance) and fixed it. |
| 10:53 | DEMO_DOOR_KEY rotated (a lane's debug step had printed it into its own tool output; not in any file). |

SPEED: the Morning cut lanes delivered about 17 estimated agent hours of tasks in about 33 minutes of wall time on four lanes, far above the plan's GREEN threshold of 1.4.

## Rollback ledger

| tag | sha | deployment id | contains | safe to show |
|---|---|---|---|---|
| demo-eve-start | e89f2de | dpl_EUTbu612Gd87sZXHnj1JSctgqmL5 | production before the work | no: leaked landing images |
| demo-safe-floor | e6f51ce | dpl_4hrMJr6HfR5c51GkLBsHaoTLZ647 | 7.1 landing privacy fix | yes |
| stabilise-1 | c4b4f97 | dpl_3hTvnivX4EKgjourifbceA13fpWF | 1.2 fra1, 1.6 splash, 1.7 security migration | yes |
| (none) | d95fcae | dpl_Dn1DFXvRMsEwtjgk5NteAhVFGJFi | Gate 1+2 merge | no: Door persona buttons answer 500 (Origin null) |
| gate-1-2 | 71d3ed9 | dpl_3eWmpkXK4wVSnVirnMez6FasURbT | Gate 1+2 plus the Door referrer hotfix | yes: Door smoke green on production for every persona, guest QR and tampered link (10:07) |

Migration undo lines (risk R6), never to be run casually:
- 1.7 `rls_and_function_grants`: `alter table public.material_check_docs disable row level security;` plus the grants, search_path resets and the dropped index, written in full in lane A's report.
- 2.1a `organizations_is_demo`: `alter table public.organizations drop column is_demo;`

## Za ustanovitelja zjutraj (only the founder can do or check these)

- Re-authorize the Supabase connector (claude.ai connector settings, or /mcp in this session).
- Resend: add the DKIM TXT record `resend._domainkey` for getbelin.com at Hostinger, then Verify.
- Vercel: remove getbelin.com and www from project belin-swsc, app.getbelin.com from project belin; the executor then attaches them to belin-app.
- The operator's legal details (Task 0.6 c and d) and the Pogoji approval, if signup is to open.
- The installed app on the phone: the launch animation plays once, not again after a refresh (headless browsers cannot test standalone mode).
- Photo 0 of the seed (day 4) shows a small blurred Lidl pylon in the background: keep or crop.

## Deviations from the plan worth knowing

- The demo client is "Svetlogradnja d.o.o.", not "Lumora Energija d.o.o.": a real LUMORA d.o.o. exists in Ljubljana (bizi.si check at 09:10). Persona domain svetlogradnja-demo.si.
- AVESOL carries its real register address and VAT id with an invented IBAN that passes the checksum.
- The translation-debt ledger (1.4a) was deferred, so every new key got real German and English text instead of Slovenian placeholders. Not reviewed by a native speaker.
- Signatures: the pads stay drawable while another field saves (the plan's lock silently dropped strokes). One unexplained 360 px run stored a second pad without its first stroke; the signer sees the canvas before confirming.
- Lane C and lane D once deleted each other's demo lock at 09:14 and 09:17; both restored it and switched to removing only their own stamp.
