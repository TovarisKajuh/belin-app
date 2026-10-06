# Recon: flows-correctness (demo-critical server paths)

Date: 2026-10-05. Read-only code review of C:\DevEnv\belin-app plus read-only probes of Supabase, Vercel, Resend and DNS. No repo file was changed, nothing was submitted in the app.

Evidence folder: C:\Users\ejand\AppData\Local\Temp\claude\C--DevEnv-belin-app\fc02d7f1-c666-4861-aeb4-7e5eac16051f\scratchpad\recon\flows-correctness\
- evidence-db-paused.txt (connector and DNS results)
- prod-epc-token-after.png (what the live demo EPC link shows right now)
- p-token-live.html (raw 404 response from production)

## Headline

Right now NOTHING that touches data works, locally or on production, and nobody can sign in on production even after that is fixed:

1. The Supabase project is PAUSED (status INACTIVE, free plan). DNS for the project host does not resolve. The live demo EPC link answers after 8.4 s with "Povezava ni veljavna" (link invalid or revoked). Local dev shares the same database, so localhost is down too.
2. The Resend sending domain getbelin.com is in status "failed" and its DKIM record is missing from DNS. Every magic link, crew claim link, invite mail, notification and accountant mail is refused, while the UI says "check your email".

After those two, the most dangerous code issues for the meeting are: server action error messages are blanked in production builds (10 components show "conflict" for every specific error), there is no error boundary anywhere, multi-stroke signatures very likely print only the first stroke on the Abnahmeprotokoll, projects created through the wizard have no scope items (progress stuck at 0 percent) and no coordinates (no weather), and the sub boss's "Dnevno poročanje" button now loops him back to his office view.

## Findings (most severe first)

### B1. Supabase project paused (blocker)
- Evidence: Supabase get_project xrwncpngjajosstvkign returns status "INACTIVE", organization plan "free". execute_sql and list_migrations time out. `nslookup xrwncpngjajosstvkign.supabase.co` returns Non-existent domain. Production https://belin-app.vercel.app/sl/p/demo-epc-k7m2x9q4 returns 404 after 8.4 s and renders "Povezava ni veljavna, Ta povezava do projekta ne obstaja ali je bila preklicana" (prod-epc-token-after.png).
- What the buyer would see: every project link "invalid", login says "check your email" and nothing arrives (requestMagicLink returns sent:true on a failed lookup, app/actions/auth.ts:71-85).
- Fix: founder restores the project in the Supabase dashboard now (free, takes minutes), waits for ACTIVE, then runs `npm run seed` the morning of the meeting (it re-stages the hour sheet countdown, see M9). Prevent a repeat during the trial: either upgrade the org to Pro (price not verified here) or add a daily keep-alive: app/api/cron/keepalive/route.ts doing one select, plus vercel.json "crons". Effort 0.5 h plus restore wait.

### B2. Resend domain getbelin.com failed, so no email leaves the app (blocker)
- Evidence: Resend list-domains: getbelin.com status "failed", avesol.si "verified". lib/email.ts:19 sends from obvestila@getbelin.com. DNS (8.8.8.8): resend._domainkey.getbelin.com is NXDOMAIN, while send.getbelin.com still has the SPF TXT and the SES MX. The DKIM record was lost, most likely when the domain's DNS was repointed (getbelin.com A now 216.198.79.1).
- Effect: magic-link login (app/actions/auth.ts:127-129), crew claim (app/[locale]/p/[token]/claim-actions.ts:62-64), sub invites (app/[locale]/app/[projectId]/actions.ts:184-186), all notifications (lib/notify.ts:261-267), accountant share (lib/data/invoices.ts:356-363). sendEmail never throws (lib/email.ts:66-90) so every surface reports success.
- Fix: re-add the Resend DKIM TXT record at the DNS host of getbelin.com and press Verify in Resend (founder, 15 min plus propagation). Interim, if the API key belongs to the same Resend account: change FROM to an avesol.si sender. Add an `npm run preflight` check that reads Resend domain status. Effort 0.25 h code.
- Unverified: that the Resend account behind the connector is the one RESEND_API_KEY belongs to.

### H1. Server action errors are blanked in production (high, blocker on any error path during a production demo)
- Evidence: React's production client replaces every server error with a generic message: node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.production.js `resolveErrorProd` ("The specific message is omitted in production builds"). The app throws i18n keys and reads `err.message` in 10 components: components/po/PoView.tsx:51, components/po/PoBuilder.tsx:106, components/final/AcceptanceFlow.tsx:61, components/final/FinalHub.tsx:68, components/final/InvoiceCard.tsx:57, components/hours/SheetEditor.tsx:56, components/hours/SheetList.tsx:60, components/hours/ChangeOrderList.tsx:61, components/crew/IncidentButton.tsx:97, components/crew/RequestButton.tsx:107.
- Scenario: on belin-app.vercel.app, signing an Abnahme without the declaration throws "final.err.declaration" (lib/data/acceptances.ts:301) and the screen says "conflict". Generating an invoice without the EPC's VAT id ("invoice.errNoVatId", lib/data/invoices.ts:120-122) shows a generic failure. An incident of kind "incident" with no note shows "generic" instead of "write what happened". In dev all of these look right, which is why it was never seen.
- Fix: one helper lib/action-result.ts: `export async function asResult<T>(fn)` that runs the work and converts a thrown Error whose message matches /^[a-z]+\.[A-Za-z.]+$/ into `{ ok: false, code }`. Wrap every exported action in app/[locale]/app/[projectId]/{po,hours,final}/actions.ts, app/[locale]/app/[projectId]/actions.ts and app/[locale]/p/[token]/actions.ts; change the 10 `run()` helpers to read `result.code`. Effort 2.5 h.

### H2. No error boundary anywhere (high)
- Evidence: `find app components -name error.tsx -o -name global-error.tsx` returns nothing. app/[locale]/not-found.tsx is a bare card with no way back.
- Scenario: a thrown error in any server component, or in a useActionState action (acceptInviteAction when an insert fails, lib/data/invites.ts:168,175; confirmLoginAction when startPersonSession throws, lib/auth.ts:89), shows Next's default "Application error" page. Transient DB failures in data loaders return null and the page calls notFound(), so a timeout reads as "this link was revoked" (exactly what production shows now).
- Fix: add app/[locale]/error.tsx (client, branded dark card, "Poskusi znova" calling reset() and router.refresh(), digest shown small for support), app/global-error.tsx, a branded not-found with links to /app and /; make getEpcDashboard, getCrewHome and getProjectCore throw on a DB error instead of returning null so error.tsx (retry) is shown, keeping notFound only for "no such row". Effort 1.5 h.

### H3. Signatures probably print only the first stroke (high, blocker if the Abnahme is signed live; PLAUSIBLE)
- Evidence: components/SignaturePad.tsx:84-89 calls onCapture on EVERY pointerup; components/final/AcceptanceFlow.tsx:276-305 uploads on every capture; lib/data/acceptances.ts:259-263 writes the fixed path `${projectId}/acceptance/${acceptanceId}-${side}.png` with upsert:true; the protocol renderer reads it with storage.download() (lib/data/acceptances.ts:367-372). docs/known-issues.md entry 2 documents both traps: upsert on an existing path keeps the ORIGINAL bytes, and download() serves a cached copy. A real signature has several strokes; the first stroke is stored first. The uploads also race (one transition per stroke). The only automated run draws a single stroke (scripts/marketing/run-demo-flow.mjs:51-69), so this was never exercised.
- Fix: capture on an explicit "Potrdi podpis" button (or debounce 800 ms after the last stroke), store each capture at a unique path `${acceptanceId}-${side}-${randomUUID()}.png` and write that path to the column, read for rendering through createSignedUrl plus a cache-busting query with cache:"no-store" (as acceptPo does at lib/data/purchase-orders.ts:356-364). Verify with a three-stroke signature after B1. Effort 1 h.

### H4. Wizard projects have no scope items: progress is 0 percent forever (high, blocker if beat 1 continues into reporting)
- Evidence: create_project_from_review (supabase/migrations/20260720190000_roofs_pitch_covering.sql:69-136) inserts project, tokens, material_items and project_roofs but never scope_items. A grep for scope_items writes finds only scripts/seed-demo.mjs:242 and :393. Progress is computed only from scope items (lib/progress.ts:12-20, lib/data/project-core.ts:54-58).
- Scenario: the EPC creates the project from a K2 report (runbook beat 1), the crew reports day one: the report form has no quantity steppers, the hero ring says 0 percent, no tempo, no projected finish. Every real customer project is like this.
- Fix: new migration that drops the 8 argument function and recreates it with p_scope jsonb (the DECISIONS.md 2026-08-12 overload lesson), plus a "Obseg del" block on the wizard review (components/wizard/Wizard.tsx) prefilled from the parse: Podkonstrukcija (target module_count, weight 2), Moduli (module_count, weight 4), DC kabliranje (editable, weight 1); lib/data/plan-imports.ts passes it; npm run gen:types. Effort 3 h.

### H5. Wizard projects have no coordinates: no weather on any report (high)
- Evidence: lib/weather.ts:18 returns null without lat/lng; the RPC never writes lat/lng; no geocoding exists (grep for lat/geocod/nominatim in lib, app, supabase). The seed sets coordinates, so the demo hides it.
- Fix: geocode zip plus city plus country at project creation (Open-Meteo geocoding API, no key) inside lib/data/plan-imports.ts createProjectFromReview, and as a fallback geocode once in submitDailyReport when lat is null and store it. Effort 1 h.

### H6. The sub boss cannot file a daily report any more (high)
- Evidence: components/sub/SubHome.tsx:81-83 links "Dnevno poročanje" to /p/[crewToken]. Since commit d9ced13 (2026-08-13 14:16, after aebeb59 added the button at 11:17) a sub token page renders CrewClaim unless the session is a CREW person (app/[locale]/p/[token]/page.tsx:34-50). If Boštjan types his email he is signed in as himself and lands back on SubHome (app/[locale]/app/[projectId]/page.tsx:52-79); the crew tabs redirect non-crew away (app/[locale]/app/[projectId]/crew-route.ts:43-44). CHANGELOG.md:124 still claims "one click, roof reporting form".
- Fix: let a sub office person with canIssueCrewLink open the report form: ProjectPage renders CrewHome (token null, session actions already accept the sub role) when `?view=crew`, SubHome links there instead of /p/token, requireCrewSurface allows the same people. Effort 1 h.

### H7. The live crew moments in the runbook cannot work as written (high)
- Evidence: docs/demo/2026-08-12-runbook-v2.md beat 2 says "tap a name"; the claim screen asks name plus email and sends a magic link (components/crew/CrewClaim.tsx:58-75). Beat 4 says "Show the crew link as a QR from Settings": no QR code exists anywhere (grep qrcode in components, app, lib: no files). Demo crew addresses are *-demo.si and are refused (lib/email.ts:26,55). Locally NEXT_PUBLIC_APP_URL is http://localhost:3000 (.env.local:10), and the Settings crew link and every emailed link use it (app/[locale]/app/settings/page.tsx:62), so a link opened on a phone or by the prospect points at their own device.
- Fix: demo from production after B1 and B2; add a QR (server-rendered SVG) next to the crew link in Settings and on SubHome; pre-claim the founder's phone the evening before with a real address; rewrite beats 2 and 4. Effort 1.5 h.

### H8. Functions run in the US, the database in Frankfurt (high)
- Evidence: Vercel get_deployment for the production deployment (commit e89f2de) returns regions ["iad1"]; Supabase region eu-central-1. Vercel docs (https://vercel.com/docs/functions/limitations, accessed 2026-10-05): functions run in iad1 by default. The final page alone awaits about 13 sequential queries (app/[locale]/app/[projectId]/final/page.tsx:25-94 plus the helpers it calls), each crossing the Atlantic. It also contradicts design law 4 (EU data hosting): personal data is processed in the US.
- Fix: vercel.json `{ "regions": ["fra1"] }`, redeploy; wrap resolveActorFromSession in React cache() so the 2 auth queries run once per request. Effort 0.5 h.
- Unverified: the exact latency gain (database paused, could not measure).

### H9. A rejected naročilnica can never be revised (high)
- Evidence: the PO page shows the builder for status "rejected" (app/[locale]/app/[projectId]/po/page.tsx:88), but savePoDraft updates the existing row only where status = 'draft' (lib/data/purchase-orders.ts:203-215), so it throws "po.conflict".
- Fix: when the latest PO is rejected or cancelled, insert a new one with the next number (insertPoWithNextNumber already exists). Effort 0.5 h.

### H10. Invoice lacks the mandatory service date and has no due date (high for a DACH buyer)
- Evidence: lib/data/invoices.ts:260-261 passes `dueDate` from a column that is never set and `servicePeriod: null`; the template only prints them when present (lib/pdf/invoice.tsx:100-102). § 14 Abs. 4 Nr. 6 UStG requires the time of the supply (https://www.gesetze-im-internet.de/ustg_1980/__14.html, accessed 2026-10-05); § 11 Abs. 1 Z 3 lit d UStG 1994 requires the day or period of the supply (https://www.ris.bka.gv.at, § 11 UStG 1994, accessed 2026-10-05).
- Fix: servicePeriod = first to last daily entry date (or acceptance date), due date = issue date plus the PO payment term, both stored on the invoice row and printed. Effort 1 h.

### H11. Photos break after an hour of not being viewed (high)
- Evidence: lib/storage.ts:129-142 caches signed URLs with unstable_cache (revalidate 3000 s) while the URLs expire after 3600 s. Next returns a stale entry immediately and only revalidates in the background (node_modules/next/dist/server/web/spec-extension/unstable-cache.js:164-196). The first render of a photo set last signed more than an hour ago gets expired URLs.
- Scenario: the founder opens the dashboard in the morning, presents in the afternoon: the day list and incident photos are broken images on the first load.
- Fix: put a time bucket into the cache key (for example Math.floor(Date.now() / 1_800_000) as an argument) and sign for 2 h; same for signDocPaths. Effort 0.5 h.

### H12. Demo seed photos are flat coloured rectangles (high, visible)
- Evidence: scripts/seed-demo.mjs:290-325 generates six 800x600 single-colour JPEGs with sharp. Those are the "photos" on the dashboard and on the completion report day pages.
- Fix: commit 10 to 12 real AVESOL site photos (resized to 1600 px) under scripts/seed-assets/ and upload those instead, 1 to 4 per day. Effort 1 h.

### H13. No way to onboard the EPC who says yes (high for "let them use it")
- Evidence: no code path creates an EPC organization: grep finds only scripts/seed-demo.mjs:142 and :191. Invites can only add a sub company or a member of an existing EPC org (lib/invites-shared.ts:21-25).
- Fix: scripts/onboard-epc.mjs (founder runs it: org with name, country, VAT id, admin person, sends the first magic link), or an "epc_company" invite kind. Effort 1 h.

### H14. An existing subcontractor cannot accept an invite to a new project (high in the first week)
- Evidence: acceptInvite refuses any email that already exists (lib/data/invites.ts:108-113) and acceptAsSubCompany always creates a new organization (lib/data/invites.ts:163-168). AddSubPanel offers only the invite link (components/project/AddSubPanel.tsx:5). Known subs can only be picked in the wizard.
- Fix: on the invite page, if the visitor is signed in as an admin of a sub org, offer "Attach <org> to this project" (conditional update where sub_org_id is null); otherwise ask him to sign in first. Effort 1.5 h.

### M1. Signed acceptance and final invoice can end up without a PDF, with no retry (medium)
- Evidence: signAcceptance flips status to signed (lib/data/acceptances.ts:307-314) before rendering (316); a render or storage failure leaves a signed protocol with no report_pdf_path, and the route answers plain text "Not found" (app/api/pdf/abnahme/[acceptanceId]/route.ts:34). generateInvoice inserts the numbered invoice (lib/data/invoices.ts:159-206) before rendering (210); after a failure every retry throws "invoice.exists" and shareToAccountant throws "invoice.errNoPdf" forever.
- Fix: render before the status move (as sendPo does), or regenerate on demand when the path is null. Effort 1 h.

### M2. A partial acceptance blocks the final one (medium)
- Evidence: startAcceptance throws "final.alreadySigned" when the latest acceptance is signed, whatever its kind (lib/data/acceptances.ts:108-110).
- Fix: allow a "final" after a signed "partial". Effort 0.25 h.

### M3. Regiestunden rule is German law applied to Austria and Slovenia, and the PDF calls it "agreed" (medium, high in front of an Austrian EPC)
- Evidence: lib/hours-shared.ts:3-20 hard-codes § 15 VOB/B six Werktage for every country; the Regiebericht says the client stayed silent "innerhalb der vereinbarten Frist von sechs Werktagen" (messages/de.json:700), but the naročilnica never states that term (lib/pdf/strings.ts poStrings carries only regieRate and paymentTerms).
- Fix: print the deemed-approval clause and the period on the naročilnica (so the hash-bound acceptance makes it agreed), store the period on the PO, use it in submitSheet. Effort 1.5 h.
- Unverified: what ÖNORM B 2110 sets for Regieberichte (a search summary mentions 14 days for objections to Bautagesberichte; not confirmed for Regie).

### M4. Failed photo uploads are dropped silently (medium)
- Evidence: components/crew/CrewReportForm.tsx:64, components/crew/IncidentButton.tsx:79, components/crew/MaterialCheck.tsx:123 keep only the uploads that succeeded and then report success.
- Fix: if any upload failed keep the draft, say "2 od 5 fotografij ni uspelo, poskusi znova", retry only the failed ones. Effort 1 h.

### M5. Incidents, change orders and requests duplicate on retry (medium)
- Evidence: the client id is validated but never stored: lib/data/incidents.ts:67-77, lib/data/change-orders.ts:100-112, lib/data/requests.ts:50-60. A lost response on rural LTE plus a retry creates a second record and a second email to the EPC.
- Fix: migration adding client_generated_id uuid unique to the three tables, upsert on it. Effort 1.5 h.

### M6. Crew claim allows account takeover by wildcard email (medium, security)
- Evidence: findOrCreateCrewByEmail matches with ILIKE, where _ and % are wildcards, against people in ANY organization (lib/data/crew.ts:204-213), and claimCrewAction sends the link to the TYPED address (app/[locale]/p/[token]/claim-actions.ts:60-64). Holding any crew link, someone types john_smith@outlook.com, which matches the stored john.smith@outlook.com of an EPC admin, and receives a login link for that admin. No rate limit either (requestMagicLink has LOGIN_RATE_MAX).
- Fix: exact match on the lowercased address, send to the stored address, reuse an existing person only if they are crew of this project's sub org, apply LOGIN_RATE_MAX. Effort 0.5 h.

### M7. K2 plans over 4.5 MB fail on Vercel (medium)
- Evidence: next.config.ts raises the action body limit to 32 MB and the parser accepts 30 MB, but Vercel caps function request bodies at 4.5 MB (https://vercel.com/docs/functions/limitations, accessed 2026-10-05). The wizard shows the generic "uploadFailed" (components/wizard/Wizard.tsx:112-113). Fixtures are up to 3.4 MB (tests/fixtures/k2/thomas-woginger.pdf), real reports with images can exceed it.
- Fix: browser uploads straight to Storage with a signed upload URL, the action parses from Storage. Effort 1.5 h.

### M8. Accountant share reports "sent" when nothing was sent (medium)
- Evidence: lib/data/invoices.ts:332-339 marks sent_to_accountant_at, then sendEmail swallows any failure (lib/email.ts:66-90). With B2 every share "succeeds" and can never be retried ("invoice.alreadyShared").
- Fix: make sendEmail return the status, send first, mark only on success. Effort 0.5 h.

### M9. Seed timing: the hour sheet countdown expires (medium, procedural)
- Evidence: scripts/seed-demo.mjs:569-577 sets sheet 2 deadline to seed time plus 2 calendar days; decideSheet refuses after the deadline (lib/data/hours.ts:277-282). If the seed last ran before 3 October, beat 5 "approve it" shows "conflict". Also submitted 2 days ago plus 2 days is not six Werktage, which a sharp viewer can count.
- Fix: run the seed the morning of the meeting (it rewrites production, shared database); seed submitted_at 4 working days back and deadline_at = addWorkingDays(submitted, 6) at 23:59 site time. Effort 0.25 h.

### M10. Completion report: pending race and large PDFs through the function (medium, PLAUSIBLE)
- Evidence: generateCompletionReportAction returns a recent document even while its storage_path is still "pending", and runs that lookup before authorization (app/[locale]/app/[projectId]/final/actions.ts:43-55). A failed run leaves a "pending" row. Photos download one by one (lib/data/final-report.ts:241-255). The download route buffers the whole PDF in the function (app/api/pdf/report/[docId]/route.ts:39-49); with real 1600 px photos a 9 day report is around 10 MB, above Vercel's 4.5 MB response limit.
- Fix: dedupe only non-pending rows after the auth check, delete the pending row on failure, download photos in parallel (limit 6), answer the PDF routes with a 302 to a 60 s signed URL after authorization. Effort 1 h.

### L1. Demo password login callable on production (low)
- Evidence: loginAction has no DEMO_LOGIN check (app/actions/auth.ts:33-44); the form is only hidden (app/[locale]/login/page.tsx:40,77) but statically imported, so the action exists in the production build. Whoever POSTs it gets a token session on the live demo project the founder presents from.
- Fix: return invalid unless DEMO_LOGIN is "1". Effort 0.1 h.

### L2. Open redirect through a tab character in next (low)
- Evidence: safeNext rejects only backslash, \n and \r (lib/auth-core.ts:37-42). "/\t/evil.example" passes; browsers strip tabs from URLs, giving a protocol-relative redirect after login.
- Fix: reject every control character. Effort 0.1 h.

### L3. create_project_from_review is SECURITY DEFINER with no REVOKE (low)
- Evidence: supabase/migrations/20260720190000_roofs_pitch_covering.sql:28; no grant or revoke in any migration; the caller-supplied subOrgId is not checked against known subs (lib/data/plan-imports.ts:235-245), which would let an EPC attach a foreign sub org and then read its vault.
- Fix: revoke execute from public, anon, authenticated; check subOrgId against listKnownSubs. Effort 0.5 h.
- Unverified: live grants (database paused).

### L4. Dates on documents in UTC (low)
- Evidence: Abnahme conductedOn (lib/data/acceptances.ts:378-383), Regiebericht dates (app/api/pdf/regie/[sheetId]/route.ts fmt), PO issuedOn (lib/pdf/render-po.tsx:108-115), invoice issue date (lib/data/invoices.ts:155), hours default date (components/hours/SheetEditor.tsx:43): between 00:00 and 02:00 local they print the previous day.
- Fix: timeZone: projectZone(country) everywhere, projectToday for the invoice. Effort 0.5 h.

### L5. Deemed approval is only written when someone looks (low)
- Evidence: lib/data/hours.ts:304-322 runs from page loads and documents only; the sub is not notified when the clock decides.
- Fix: a daily Vercel cron calling persistDeemed for all submitted sheets. Effort 0.5 h.

## Checked and fine
- Magic link consumption is one conditional update and POST only (app/[locale]/auth/verify/[token]/actions.ts:38-47); logout revokes the session row (lib/auth.ts:106-119).
- PO send renders and stores before the status move and accept re-hashes through a cache-busted signed URL (lib/data/purchase-orders.ts:300-310, 356-364).
- Hour sheet and change order decisions are single conditional updates; decideSheet refuses after the deadline.
- submit_daily_report and submit_material_check are idempotent on the draft id and validate path prefixes; the material gate is enforced server side (lib/data/reports.ts:122-126).
- Money: round2 and lineTotal normalise floating point; reverse charge invoices carry no VAT row; holiday tables for SI, DE, AT 2026 and 2027 match the Easter based dates.
- Vercel production env has no DEMO_LOGIN and no NEXT_PUBLIC_APP_URL (falls back to the production host).
- Vercel runtime errors last 7 days: none. PDF generation including fonts has run on production before (CHANGELOG.md:167).

## Unverified
- Live function definitions versus the repo: the database is paused, pg_get_functiondef could not run.
- H3 is reasoned from code plus the documented storage traps; needs a three-stroke test after B1.
- Whether the 4.5 MB response limit applies to the buffered PDF responses (M10).
- Whether fluid compute (300 s default duration) is enabled for the project.
- Which Resend account RESEND_API_KEY belongs to (B2 interim fix).
- ÖNORM B 2110 deemed-approval period for Regieberichte (M3).
- Execute grants on create_project_from_review (L3).
- Whether Vercel's data cache keeps unstable_cache entries across deployments (affects H11 on production; locally it does).
