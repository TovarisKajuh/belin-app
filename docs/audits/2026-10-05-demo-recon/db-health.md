# db-health

## summary
The database is up (19:16 UTC, PostgreSQL 17.6, 15 MB) and answers every query. The demo data is intact, clean, but 5 weeks stale: it is exactly the state of the last seed, run on 2026-08-31 at 11:35 UTC.
- The Kranj log ends 2026-08-28, 38 days ago.
- The day-one project Ljubljana had a planned start of 2026-08-31.
- The hour-sheet countdown expired on 2026-09-02, and tonight a recon page view persisted it as deemed_approved.
- The amber vault document (Freistellungsbescheinigung) is now RED: it expired 2026-09-18.

No rehearsal residue in rows: there are no stranger orgs, no extra projects, no closing-chain rows, no extra incidents, change orders or requests, and no strangers in the crew. The two naročilnica PDFs exist and their sha256 re-verify against the stored bytes.

Seed tripwire: `npm run seed` would NOT refuse. All 6 orgs are in KNOWN_ORGS.

Security is confirmed live:
- public.material_check_docs has RLS OFF, and anon holds SELECT, INSERT and DELETE on it. The security advisor reports this at level ERROR.
- create_project_from_review is SECURITY DEFINER and executable by anon and authenticated through /rest/v1/rpc. The advisor reports this as WARN.

Schema: there is no functional drift between the live database and supabase/migrations. The only differences are stripped comments and two superseded create_project_from_review steps.

Story bugs a reseed keeps:
- The seed photos are flat navy rectangles (confirmed by viewing the live file).
- The vault rows point at files that do not exist (the docs bucket is empty).
- The Ljubljana PO line says "Kranj".
- The material check is stamped at seed time, after 9 logged days.
- A Tuesday-morning reseed puts an incident and two hour-sheet lines on a Saturday or Sunday.

## current_state
- Checked 2026-10-05, 19:16 to 19:25 UTC, through the Supabase connector (execute_sql SELECT only, get_advisors, list_tables, list_migrations) plus one read-only Node probe with the service key. That probe downloaded 2 PO PDFs and 1 photo and ran 3 anon SELECTs.
- No Playwright pass: this key is DB health, and page views in this app write to the DB (see F-08).
- Other recon agents were active at the same time and changed data during my window:
  - 19:14 and 19:16: document_reminders, activity, notifications and email_log rows were written, and hour sheet 2 flipped to deemed_approved.
  - 19:19: a new K2 upload created plan_import cdf4cab0 and pruned the two 08-13 review imports.
  - login_tokens went from 91 to 93 and sessions from 82 to 84.
- Row counts at 19:24: organizations 6, people 7, projects 8, daily_entries 54, entry_photos 6, scope_items 21, material_items 25, material_checks 1, activity 44, notifications 2, email_log 82, documents 3, document_reminders 1, hour_sheets 2, change_orders 1, incidents 2, requests 2, purchase_orders 2, invoices 0, acceptances 0, generated_documents 0, plan_imports 2, project_roofs 1, project_tokens 6, invites 1, login_tokens 93, sessions 84, storage objects 37, auth.users 0.
- Raw per-query results: recon/db-health/query-results.md.

## health pack results (post-restore-health.sql)
- Q0: up, 15 MB.
- Q1 strangers: 0 rows.
- Q2 projects: Kranj active planned 08-18..09-29. Ljubljana active planned 08-31..10-12. Planung Engelmeier (founder's own org, de, no dates). Book: 4 finished, Lidl Domžale draft planned 09-12..10-24. No German overlay: all names, notes and scope are Slovenian.
- Q3 extra projects in the demo EPC org: 0.
- Q4 Kranj: 9 entries 08-18..08-28, 38 days since the last. Ljubljana: 0.
- Q5 hour sheets: #1 approved. #2 deemed_approved (deadline 2026-09-02, row updated 2026-10-05 19:16:06). The countdown beat is gone until a reseed.
- Q6: CO #1 approved 1200.00. Incidents rain_stop 08-27 and obstruction 08-29 (a Saturday). Requests: material resolved, plan open. All seed rows, nothing extra.
- Q7 vault (AVESOL):
  - Freistellungsbescheinigung valid_until 2026-09-18, which is -17 days (red, not amber).
  - A1: +85 days.
  - Insurance: +165 days.
  - No file exists for any of the three storage paths.
- Q8 POs: Kranj #1 accepted (sent 08-19, accepted 08-20) and Ljubljana #1 sent (08-30, a Sunday). Both have pdf_path and hash, the objects exist, and sha256 matches the stored bytes.
- Q9 closing chain residue: none.
- Q10 material check: checked_at 2026-08-31 11:35 (seed time), while the first log day is 08-18.
- Q11 plan_imports: 2 now (1 committed, plus 1 review created tonight by recon). There were 3 at 19:19.
- Q12: login_tokens 93 (0 live), sessions 84 (2 live). Oldest 08-10 and 08-12. Never pruned.
- Q13 AVESOL crew: Luka Zupan, Boštjan Novak (admin), Miha Oblak. All are seed ids.
- Q14 tokens: the demo tokens are unrevoked. last_used_at stays at 2026-07-17 even though the tokens were used daily. A crew token exists on the finished Komenda project and is not created by the seed.
- Q15 notifications: 2, both created tonight by page views.
- Q16 email_log: 5 sent (last 2026-08-10), 76 refused demo-domain (latest tonight), 1 failed example.com. Nothing was sent to a real address after 08-10.
- Q17 storage: docs 0, photos 19 (2.49 MB), plans 2, reports 8, signatures 8. No public bucket. storage.objects has RLS on and 0 policies.
- Q18: all 3 documents rows point at missing files.
- Q19: 34 tables have RLS on with 0 policies. material_check_docs has RLS off.
- Q20: 21 live migrations against 20 files (see drift).

## advisors
Security:
- ERROR rls_disabled_in_public: public.material_check_docs.
- WARN anon_security_definer_function_executable: public.create_project_from_review(uuid, uuid, uuid, jsonb, jsonb, text, text, jsonb).
- WARN authenticated_security_definer_function_executable: same function.
- WARN function_search_path_mutable: public.scope_installed, public.submit_material_check, public.submit_daily_report.
- INFO rls_enabled_no_policy on 34 tables. This is by design: deny-all, server uses service_role. The tables are acceptance_defects, acceptances, activity, change_order_photos, change_orders, daily_entries, document_reminders, documents, email_log, entry_photos, entry_quantities, generated_documents, hour_sheet_lines, hour_sheets, incident_photos, incidents, invites, invoices, login_tokens, material_check_items, material_checks, material_items, notifications, organizations, people, plan_imports, project_roofs, project_tokens, projects, purchase_order_lines, purchase_orders, requests, scope_items, sessions.

Performance:
- WARN duplicate_index: public.material_checks has identical indexes idx_material_checks_project_checked and idx_material_checks_project_latest.
- INFO unindexed_foreign_keys (19): activity.actor_person, change_orders.created_by_person, change_orders.decided_by_person, daily_entries.created_by_person, documents.uploaded_by_person, hour_sheet_lines.person_id, hour_sheets.created_by_person, hour_sheets.decided_by_person, hour_sheets.sub_org_id, incidents.created_by_person, invites.created_by_person, invoices.created_by_person, material_check_items.material_item_id, material_checks.checked_by_person, notifications.project_id, plan_imports.created_by_person, purchase_orders.accepted_by_person, purchase_orders.created_by_person, requests.created_by_person.
- INFO unused_index (34): meaningless right after a resume because the statistics were reset. Ignore.

## specific checks
- (a) RLS: 35 public tables. RLS is on for 34 and OFF for material_check_docs. has_table_privilege shows anon SELECT, INSERT and DELETE on every table (Supabase default grants), so RLS is the only guard. The browser ships the anon key: lib/supabase/client.ts:9 is used by components/LiveRefresh.tsx, VaultPanel.tsx, CrewReportForm.tsx and others.
- (b) Function grants:
  - create_project_from_review is the only SECURITY DEFINER function (search_path=public). Its ACL is {=X/postgres, anon=X, authenticated=X, service_role=X}.
  - submit_daily_report, submit_material_check and scope_installed are INVOKER and also executable by PUBLIC, anon and authenticated. As anon they hit deny-all RLS on their first insert, so they are harmless.
  - create_project_from_review bypasses RLS. Its only gate is a plan_imports row in status 'review' (it accepts any p_epc_org_id, a caller-chosen p_epc_token, and any sub org of type sub).
- (c) Drift:
  - create_project_from_review live body is byte-identical to supabase/migrations/20260720190000_roofs_pitch_covering.sql.
  - submit_daily_report live body equals 20260813120000_crew_identity.sql once comments are removed. The live body lacks the comment at line 54.
  - submit_material_check equals 20260719170000 once comments are removed.
  - scope_installed is byte-identical.
  - No functional drift.
- (d) Migrations: 19 live entries match a repo file by normalized content. Two are named differently:
  - Live 20260720122946 create_project_from_review (the first 7-arg body) has no file. The repo file 20260720150000_create_project_from_review.sql equals live 20260720123107 create_project_from_review_country_check.
  - Live 20260720143610 create_project_from_review_with_roofs equals the repo file 20260720180000_create_project_from_review_baseline.sql apart from quoting.
  - Neither side ever enables RLS on material_check_docs, and neither has a REVOKE on the definer function.
- (e) Organizations: 6, all in KNOWN_ORGS (scripts/seed-demo.mjs:77-78): the 5 DEMO_ORGS plus FOUNDER_OWN_ORG cebcb3df. No strangers.
- (f) Duplicate emails: none. The founder has two separate people: info@avesol.eu in Moje podjetje and e.jandrozg@gmail.com in avesol sp.
- (g) Storage: listed above. The seeded photos are photos/33333333-3333-4333-8333-333333333333/seed/photo-0.jpg to photo-5.jpg, each 3,117 bytes, one flat navy colour (viewed: recon/db-health/seed-photo-3-live.jpg). There are 27 orphan objects: 13 photos (2.47 MB), 6 report PDFs and 8 signatures.
- (h) Covered in Q4, Q5, Q7, Q8, Q9, Q11 and Q12 above.

## findings
- [high] F-01: material_check_docs has RLS disabled in the live DB, and anon holds SELECT, INSERT and DELETE
  evidence:
  - get_advisors security: ERROR rls_disabled_in_public.
  - pg_class.relrowsecurity = false.
  - has_table_privilege(anon) select, insert and delete are all true, with 0 policies.
  - The table is created at supabase/migrations/20260719150000_material_check_docs_and_submit.sql:15, and no file enables RLS on it.
  - The anon key is in the browser bundle (lib/supabase/client.ts:9).
  - The table has 0 rows today, so nothing has leaked yet.
  impact: Anyone with the public key can list or delete every delivery-note record once real customers use the material check.
  fix: Add migration `alter table public.material_check_docs enable row level security;`, apply it with the connector, and land the matching file in the same commit. Then re-run get_advisors. It is safe: every app access goes through service_role.
- [medium] F-02: create_project_from_review is SECURITY DEFINER and callable by anon and authenticated via /rest/v1/rpc
  evidence:
  - proacl {=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}.
  - Advisor WARN 0028 and 0029.
  - The body accepts any p_epc_org_id and a caller-chosen p_epc_token. Its only gate is a plan_imports id in status 'review' (one exists right now: cdf4cab0, created 19:19 by recon).
  impact: Anyone holding an unconsumed import id could create a project inside any EPC org, attach any sub, and choose its access token. Exploitability is low (UUIDs), but it is a needless hole.
  fix: Migration: `revoke execute on function public.create_project_from_review(uuid,uuid,uuid,jsonb,jsonb,text,text,jsonb) from public, anon, authenticated;`. Optionally revoke the 3 invoker functions too, and set search_path on them.
- [high] F-03: Demo data is 5 weeks stale, and the hour-sheet countdown and the amber vault beat are both dead
  evidence:
  - Last seed was 2026-08-31 11:35 UTC.
  - Kranj log 08-18..08-28 (38 days old).
  - Ljubljana planned_start 08-31.
  - Sheet 2 deadline 2026-09-02, status deemed_approved since 2026-10-05 19:16:06.
  - Freistellungsbescheinigung valid_until 2026-09-18 (-17 days).
  impact: Opening the demo now shows a project that stopped reporting a month ago, an expired document and no live countdown.
  fix: Run `npm run seed` after 00:00 UTC (02:00 CEST) on Tue 2026-10-06, and after the recon agents stop. Then re-run the health pack. A seed before 02:00 CEST ends the log on Fri 10-02 and leaves Monday empty (computed with the seed's own date logic, recon/db-health/seed-dates.mjs).
- [medium] F-04: Seeded vault documents point at files that do not exist
  evidence: documents.storage_path is demo/a1.pdf, demo/freistellung.pdf and demo/insurance.pdf. The docs bucket has 0 objects.
  impact: In the vault, the 3 documents have no file to open, which undercuts the 'compliance vault' claim.
  fix: Render and upload 3 'VZOREC' PDFs in the seed (BO-10d).
- [medium] F-05: Seed photos are flat navy rectangles in live storage
  evidence: 6 objects, each 3,117 bytes, at photos/3333...3333/seed/photo-0..5.jpg. photo-3 was downloaded and viewed: a solid dark navy 800x600 image.
  impact: The gallery and the completion report show blank tiles.
  fix: As in BO-07: real photos on NEW paths. Supabase upsert on the same path keeps the old bytes (seed-demo.mjs:309-312).
- [low] F-06: Seeded dates fall on weekends, and work starts before the PO
  evidence:
  - Live: the obstruction incident is on 2026-08-29 (Saturday), and the Ljubljana PO was sent 2026-08-30 (Sunday).
  - Kranj log starts 08-18, but its PO was sent 08-19 and accepted 08-20.
  - With a reseed at Tue 06:00 UTC: sheet 1 line on Sun 09-27, sheet 2 submitted Sun 10-04, sheet 2 line on Sat 10-03, obstruction on Sun 10-04, PO sent Thu 09-24 and accepted Fri 09-25, after the first log day Wed 09-23.
  - Sources: seed-demo.mjs:505-509, 564-600 and 632-639 use plain day offsets.
  impact: An operations-minded EPC sees weekend hour lines and work logged before the order was accepted.
  fix: Snap every seeded date to the working-day list (`dates[]`). Send the PO at dates[0] minus 3 working days.
- [low] F-07: The day-one project's PO line reads 'Kranj'
  evidence: purchase_order_lines on PO 8888...8802 (Ljubljana) has the description 'Montaža FV sistema 245.7 kWp, Kranj' (seed-demo.mjs:544).
  impact: Visible on the naročilnica PDF of the day-one beat.
  fix: Use a per-project description.
- [medium] F-08: Plain page views write to the DB, and they consumed the countdown beat tonight
  evidence:
  - At 19:14:28 to 19:16:11 UTC, recon page views created document_reminders 8c978c4a, activity document_expiring and hours_deemed_approved, 2 notifications and 2 email_log rows.
  - They also set hour_sheets 9999...9902 to deemed_approved (updated_at 19:16:06).
  - Code: lib/data/epc-dashboard.ts:355-378 and lib/data/hours.ts:317.
  impact: Any rehearsal or agent page load after the 48 h deadline permanently kills the countdown until the next seed. Agents walking the app tonight also mutate the demo state.
  fix: Reseed after all recon and rehearsal are done, and re-check Q5 right before the meeting.
- [low] F-09: Residue the seed never cleans: storage orphans, activity, auth tables, email_log
  evidence:
  - 27 orphan storage objects: 13 photos (2.47 MB, including 0-founder-feedback-test.jpg and 2 under the deleted project prefix d57c0b68), 6 report PDFs (old PO c1df074a, 4 invoices, 1 completion report) and 8 signature PNGs.
  - activity: 44 rows. 5 sit on the day-one project (4 material_check_completed, 1 entry_submitted from July), and today's rows remain. Only the closing kinds are deleted (seed-demo.mjs:869-879).
  - login_tokens 93, sessions 84, email_log 82.
  - A crew token sits on the finished Komenda project.
  - A 'review' plan_import and its PDF were created tonight.
  impact: Not shown in the UI. activity drives only the portfolio sort order (lib/data/portfolio.ts:155-243), so the day-one project sorts by a July timestamp. Storage clutter.
  fix: Optional: a demo-scoped cleanup step (BO-11), plus a daily prune cron (BO-17).
- [low] F-10: Duplicate index on material_checks, and mutable search_path on 3 functions
  evidence: Advisors: WARN duplicate_index (idx_material_checks_project_checked = idx_material_checks_project_latest). WARN function_search_path_mutable on scope_installed, submit_material_check and submit_daily_report.
  impact: Hygiene only.
  fix: In the same hardening migration: drop one index, and `set search_path = public` on the three functions.

## earlier recon: confirmed or refuted
- BO-01 / crew-walk B1 / flows B1 (Supabase paused): REFUTED as of 19:16 UTC. The DB answers, PostgreSQL 17.6.
- BO-15 (material_check_docs no RLS): CONFIRMED live (F-01).
- flows L3 (definer function without REVOKE): CONFIRMED (F-02).
- BO-07 / flows H12 (flat navy seed photos): CONFIRMED (F-05). The replica byte size 3,117 matches.
- BO-10a (Kranj PO line on Ljubljana): CONFIRMED (F-07).
- BO-10c (material check stamped at seed time): CONFIRMED. checked_at 2026-08-31 11:35, log starts 08-18.
- BO-10d (vault files never uploaded): CONFIRMED (F-04).
- flows M9 (countdown expires, reseed needed): CONFIRMED (F-03). It was also persisted tonight (F-08).
- BO-09 tripwire blocking: NOT TRIGGERED today, with 0 strangers. seed-documents would touch only the 2 demo POs, the only sent or accepted ones in the DB.
- BO-11 residue: PARTLY REFUTED for rows. There are no wizard projects, extra incidents, requests, change orders, hour sheets or crew strangers. It holds only for storage, activity and auth tables (F-09).
- BO-05 (real company name): CONFIRMED in live data. Organization 1111... is named 'Sonce Energija d.o.o.'.
- backend-ops 'demo left in German or mid closing chain': REFUTED. All rows are Slovenian, and the closing chain is empty.
- BO-02 (Resend failed): NOT PROVABLE from the DB. email_log shows the last real-address 'sent' on 2026-08-10, and nothing since. This is consistent with the claim, not proof.
- flows H3 (signature upsert per stroke): PARTIAL evidence. The orphan signatures/.../a684cdee-...-epc.png has created_at 21:34:44 and updated_at 21:36:11 (2026-08-12), so the same path was overwritten during one signing. The print result cannot be checked from the DB.

## reseed: what it must clean, and the tripwire
Tripwire: `npm run seed` would NOT refuse. The organizations query returns 6 rows, all in KNOWN_ORGS: 11111111..., 22222222...222, ...223, ...224, 12121212..., cebcb3df....

What `npm run seed` fixes (code at scripts/seed-demo.mjs, checked against live rows):
- The Kranj log is rebuilt to 9 weekdays ending yesterday (UTC).
- Planned dates are re-dated for both live projects and the book.
- Hour sheet 2 goes back to 'submitted' with a deadline of seed plus 48 h.
- The vault is re-inserted with Freistellung at plus 18 days (amber). document_reminders cascade away.
- Notifications on both demo projects are deleted.
- The material check, incidents and requests are re-created.
- Both POs are re-rendered and re-hashed by seed-documents (only these 2 qualify).
- Closing-chain rows and generated documents are cleared (none exist now).

What it does NOT clean, so do it separately if wanted:
1. The 27 orphan storage objects.
2. 44 activity rows, including today's document_expiring and hours_deemed_approved, and the July rows on the day-one project.
3. login_tokens, sessions and email_log.
4. The tonight 'review' plan_import cdf4cab0 and its PDF in plans/pending/.
5. The Komenda crew token.

What it keeps wrong: navy photos, missing vault files, the Ljubljana PO line saying Kranj, the material check stamped at seed time, weekend-dated hour lines and incident, and work starting before the PO. It also keeps the real company name.

When to run it: after 00:00 UTC (02:00 CEST) on Tue 2026-10-06, after all recon and rehearsal page views, and at most about 40 h before the meeting, because the deadline is seed plus 48 h. Re-run health pack Q4, Q5, Q7, Q8 and Q9 straight after.

## unverified
- Whether F-02 is reachable in practice: whether a 'review' import id ever reaches a browser URL or HTML. I did not trace the wizard.
- Exact pause start. The realtime.messages partitions jump from 2026-09-03 to 2026-10-04, which suggests a pause from early September. This is an inference.
- The Resend domain state (see BO-02). The DB only shows that nothing was sent to a real address after 08-10.
- How the app renders right now: no Playwright walk in this key.

## artifacts
- C:\Users\ejand\AppData\Local\Temp\claude\C--DevEnv-belin-app\fc02d7f1-c666-4861-aeb4-7e5eac16051f\scratchpad\recon\db-health.md
- C:\Users\ejand\AppData\Local\Temp\claude\C--DevEnv-belin-app\fc02d7f1-c666-4861-aeb4-7e5eac16051f\scratchpad\recon\db-health\query-results.md
- C:\Users\ejand\AppData\Local\Temp\claude\C--DevEnv-belin-app\fc02d7f1-c666-4861-aeb4-7e5eac16051f\scratchpad\recon\db-health\seed-photo-3-live.jpg
- C:\Users\ejand\AppData\Local\Temp\claude\C--DevEnv-belin-app\fc02d7f1-c666-4861-aeb4-7e5eac16051f\scratchpad\recon\db-health\seed-dates.mjs
- C:\Users\ejand\AppData\Local\Temp\claude\C--DevEnv-belin-app\fc02d7f1-c666-4861-aeb4-7e5eac16051f\scratchpad\recon\db-health\fn-md5.mjs
- C:\Users\ejand\AppData\Local\Temp\claude\C--DevEnv-belin-app\fc02d7f1-c666-4861-aeb4-7e5eac16051f\scratchpad\recon\db-health\file-md5.mjs
- C:\Users\ejand\AppData\Local\Temp\claude\C--DevEnv-belin-app\fc02d7f1-c666-4861-aeb4-7e5eac16051f\scratchpad\recon\db-health\storage-probe.mjs
