# Recon: market benchmark (key: market-benchmark)

Date: 2026-10-05. Read-only. Every FACT below carries a source URL accessed 2026-10-05 (full list in `recon/market-benchmark/sources.md`). Tiers follow `docs/gtm/INDEX.md`: FACT (sourced), PATTERN (inputs named), J (judgment, to be logged in `docs/gtm/field-log.md` if used).

Artifacts (all under `C:\Users\ejand\AppData\Local\Temp\claude\C--DevEnv-belin-app\fc02d7f1-c666-4861-aeb4-7e5eac16051f\scratchpad\recon\market-benchmark\`):
- `shots/*-desk.png`, `shots/*-mob.png`, `shots/*-desk-fold2.png`: hero captures of Capmo, PlanRadar, Craftnote, Fieldwire, Reonic, conova24, Tenera, NachweisHub, 123erfasst, TabTool, and Belin live (sl, de)
- `shots/splash-300..4500.png`, `shots/splash-revisit-1200.png`: Belin launch splash covering the landing
- `shots/wizard-review-top.png`: the landing's K2 review screenshot at full size
- `shots/sheet-sl.png`, `shots/sheet-de.png`: the landing document images
- `shots/belin-live-de-bottom.png`, `shots/belin-live-de-login-*.png`
- scripts: `shoot-competitors.mjs`, `perf.mjs`, `splash.mjs`, `paper.mjs`, `sheet.mjs`, `login.mjs`

---

## 1. What the 2026 market shows buyers (competitor table)

| Tool | Hero promise | Proof | Trust | Price model (public?) | CTA | Mobile | Subs |
|---|---|---|---|---|---|---|---|
| Capmo | "Die smarte Projektassistenz für die Bauleitung", "Nr. 1 ... D-A-CH" | 100.000+ projects, 15 logos, named testimonials | ISO 27001 standards (pricing page), Munich address | Volume based, entry "mid four-digit" EUR, unlimited users, 14 day trial, no card | Beratungsgespräch buchen, Produkttour | App Store, Play | External users free |
| PlanRadar | "Klare Prozesse, verlässliche Ergebnisse, unterstützt durch KI" | 200,000 users, 75 countries, HOCHTIEF, PORR, Siemens | GDPR, ISO, AWS | 26 / 89 / 129 EUR per user per month, 30 day trial | 30 Tage kostenlos testen, Demo vereinbaren | Apps | "Kostenloser und unlimitierter Zugang für Auftragnehmer" |
| Craftnote | "Effiziente, digitale Abläufe ohne Zettelchaos" | 35,000 users, 6000+ reviews at 4.8 | Berlin address | 14.90 / 29.90 / 49.90 EUR per user per month, yearly, 30 day trial | Kostenlos testen | Apps | not stated |
| Fieldwire | "Jobsite Management For Construction Teams" | 4,000,000 jobsites, logos | footer link | 0 / 39 / 64 / 89 USD per user per month | Get Started Free, Request Demo | Apps, offline | n/a |
| 123erfasst | "Deine Apps für die Baustelle" | Strabag, Otto, Kemna logos | "Hosted in Germany", "Made in Germany" | "ab 0 EUR", modular | Jetzt kostenlos starten | Apps, offline; Nachunternehmer tile in app | module |
| Reonic (solar) | "Die All-in-One Software für Solarteure" | 3.000+ customers, 4.8 from 89 reviews | register data | not public, demo | Demo buchen | Apps, "Installation am Handy" | n/a |
| HERO (solar trade) | trade software, PV page | | | 69 / 119 / 299 EUR per month base, extra app licences 22 to 25 EUR | Jetzt testen, 14 days | App included | n/a |
| TabTool PV (utility PV) | "The Construction Management Software for Solar Professionals" | BSW badge | "developed and hosted in Germany" | demo | Get a demo | app | subs "without their own TabTool login" |
| COMP4 (PV FSM) | "Field Service Management Software für Photovoltaik & Solar" | "ein großer Anbieter" | "100% Hosting & Entwicklung in Deutschland", ISO 27001 data centres | demo | Jetzt Demo anfragen | offline app | external firms on one system |
| CraftedEX | "Die KI-Software für die Baustelle" | | | 14 day trial | | tablet, finger signature | Regie deadlines "werden automatisch nachgehalten" |
| conova24 Baubescheinigungen | "Bescheinigungsportal für Baustellen" | | "Server stehen in Deutschland", DSGVO | free for subs | Termin vereinbaren, Kostenlose Demo | App | "einmal hoch und geben gezielt frei, ohne Kosten" |
| Tenera | "Nachunternehmerrisiken endlich unter Kontrolle." | none | none | demo | Demo anfragen | | portal; A1 tracked |
| NachweisHub | "Bescheinigung abgelaufen? Wir stellen die Anfrage." | live status card as hero | "DSGVO-konform", "EU-Rechenzentren" | "Für immer kostenlos" basic, 30 day Pro | Kostenlos starten, role split "Ich bin Subunternehmer / Auftraggeber" | | free for subs |
| Freistellungsmanager | "Nie wieder abgelaufene Freistellungsbescheinigungen" | none | "Datenbank in Frankfurt (eu-central-1)", "ISO-27001-Infra", "Row Level Security" | 29 / 79 / 249 EUR per month by number of subs, 30 day money back | "Live-Demo ohne Anmeldung testen" | | |
| Enpal.pro (partner network) | B2B platform for PV partners | 8 brand logos, press | | | Registrieren: 2 min, check within 1 business day | | |
| Zolar | in liquidation since 2025; installer software sold to Sollit Oct 2025 | | | | | | |

Sources: see sources.md. Screens: `shots/<name>-desk.png`.

### PATTERNS (inputs: the 15 sites above)

1. **Hero = a named pain or outcome plus two CTAs**, primary demo or trial, secondary tour or "how it works". 10 of 10 captured heroes have a demo or trial CTA above the fold. Login is a small nav link everywhere (Capmo, PlanRadar, Tenera, Reonic, NachweisHub).
2. **A proof band sits directly under the hero**: a number plus logos (Capmo, PlanRadar, Reonic, Fieldwire, 123erfasst, Craftnote). Where there are no customers (Tenera, Freistellungsmanager), there is no band, and the page relies on the problem statement.
3. **Trust is stated in one line of facts**: hosting location, DSGVO, ISO 27001 (Capmo, PlanRadar, upmesh, COMP4, conova24, 123erfasst, Freistellungsmanager).
4. **Subs free is table stakes**, not a differentiator (PlanRadar, Capmo, conova24, NachweisHub).
5. **Live product status as hero visual** for compliance tools (NachweisHub's traffic light card). Field tools show phone plus laptop collages (Reonic, Capmo, 123erfasst). Field apps shown in competitor marketing are light themed (Capmo, 123erfasst, Reonic screenshots).
6. **Trial windows are 14 or 30 days** (Capmo 14, HERO 14, CraftedEX 14, PlanRadar 30, Craftnote 30, NachweisHub Pro 30). A no-login live demo exists at Freistellungsmanager; Capmo offers a free product tour.
7. **"KI" is in most 2026 heroes** (Capmo, PlanRadar, CraftedEX, 123erfasst).
8. **App store badges** on every field tool site. Nobody positions a PWA.

### The category map has moved since HANDOFF section 7 (July 2026)

- The VOB clock is no longer unclaimed: CraftedEX says Regie deadlines "werden automatisch nachgehalten" (page "Stand: August 2026").
- "Sub uploads once, shares with many EPCs, free" exists in Germany: conova24 and NachweisHub. Belin's passport is not unique on its own.
- PV specific execution tools with external partners exist: COMP4 (residential and commercial FSM), TabTool (utility scale), Reonic and HERO installation modules.
- **What is still unclaimed, as far as these 15 sites show:** one tool that runs the cross-border chain SI crew to AT or DE roof end to end: plan in, crew reports, hours and Nachträge, Abnahme, invoice in the project language, plus the posting and liability paperwork checked at the moment of payment. That combination, and the founder being the subcontractor, is the position. (PATTERN, inputs above; absence is not proof, so treat as J until a competitor file is written.)

---

## 2. Verified legal hooks (FACT unless marked)

### Germany
- **Bauabzugsteuer**: recipient must withhold 15 percent (§ 48 EStG). Annual de minimis 5,000 EUR (15,000 EUR for exclusively tax exempt recipients). Since 2015 PV installed on a building counts as Bauleistung (BayLfSt Verfügung 16.9.2015, via Haufe).
- **The defence is time-stamped**: the recipient is liable for unwithheld tax (§ 48a Abs. 3) and is NOT liable only if a Freistellungsbescheinigung "im Zeitpunkt der Gegenleistung ... vorgelegen hat". The BZSt offers an electronic query (§ 48b).
- **Wage surety**: § 13 MiLoG applies § 14 AEntG: an Unternehmer who commissions another is liable like a Bürge without Einrede der Vorausklage for minimum wage of the sub, its subs and their lenders. BAG 10 AZR 190/11 (16.05.2012) limits it to passing on one's own contractual obligation, which is exactly the EPC situation (secondary source, Noerr).
- **Fine for the EPC itself**: § 21 Abs. 2 MiLoG: whoever has work done "in erheblichem Umfang" by a sub of whom he knows or negligently does not know that it underpays: fine up to 500,000 EUR (§ 21 Abs. 3).
- **Time records**: § 17 MiLoG and § 19 AEntG: start, end and duration of daily working time, recorded within 7 days, kept 2 years; for construction the documents must be available on the site on request, in German (§ 19 Abs. 2 AEntG).
- **Prior posting notification**: foreign employers posting to German construction must notify customs online in advance via Meldeportal-Mindestlohn (Zoll page).
- **Social security liability**: § 28e Abs. 3a SGB IV: construction GC liable for sub's contributions above 275,000 EUR total Bauleistungen per Bauwerk; exculpation by Präqualifikation or complete Unbedenklichkeitsbescheinigungen.
- **Reverse charge**: § 13b Abs. 2 Nr. 4 UStG for Bauleistungen when the recipient itself provides Bauleistungen sustainably; Finanzamt certificate valid up to 3 years (Abs. 5).
- **E-invoicing**: every domestic business must be able to receive e-invoices since 1.1.2025; issuing is mandatory from 1.1.2027 for prior-year turnover above 800,000 EUR and from 1.1.2028 for all domestic B2B; formats XRechnung and ZUGFeRD from 2.0.1 (not MINIMUM, BASIC-WL); under 250 EUR exempt (BMF FAQ, page date 23.03.2026). **It covers domestic to domestic only**, so an SI sub invoicing a DE EPC is not bound.
- **Impressum**: § 5 DDG requires it "leicht erkennbar und unmittelbar erreichbar" and permanently available for commercial digital services.

### Austria
- **Auftraggeberhaftung**: 20 percent (§ 67a ASVG) plus 5 percent (§ 82a EStG) of the Werklohn for passed-on Bauleistungen, removed if the sub is on the HFU Gesamtliste **at the time of payment** (USP, updated 02.03.2026; tax adviser note 27.09.2026). Since 1.1.2026 for Arbeitskräfteüberlassung in construction: 32 plus 8 = 40 percent (EWT, TPA 27.01.2026). BGBl reference not found.
- **LSD-BG § 21**: A1, the ZKO posting notification and any permit must be kept at the site **or made accessible in electronic form** at inspection (Fassung 27.04.2024).
- **LSD-BG § 22**: Lohnunterlagen including Arbeitszeitaufzeichnungen, in German or English, at the site or electronically accessible at the time of inspection (Fassung 20.07.2022).
- **Penalties**: § 26 notification breaches up to 20,000 EUR; § 28 Lohnunterlagen not kept up to 20,000 EUR, repeat 40,000 EUR (Fassung 01.08.2026); § 27 refusing inspection up to 40,000 EUR; all counted as one offence regardless of worker count.
- **LSD-BG § 9**: in construction the Auftraggeber is liable as Bürge und Zahler for posted workers' wages, via a BUAK procedure.
- **Regie clock is NOT VOB/B in Austria**: ÖNORM B 2110 Pkt 6.4.3 requires daily Regie records submitted within the agreed period or 7 days; Pkt 8.2.3.3 deems them recognised if no written objection within 2 weeks; OGH 9 Ob 19/15g (28.05.2015) applies that only to records submitted within the 7 days.
- **Reverse charge**: § 19 Abs. 1a UStG 1994 for Bauleistungen to an Unternehmer who is itself commissioned with Bauleistungen.
- **E-invoicing**: no general domestic B2B mandate (article 06.06.2026); B2G mandatory since 1.1.2014; ViDA cross-border reporting from 1.7.2030.

### Slovenia
- **ZIERDED** (Zakon o izmenjavi elektronskih računov in drugih elektronskih dokumentov), adopted October 2025: from **1.1.2028** all B2B invoices between Slovenian registered businesses must be structured e-invoices (e-SLOG, or EN 16931 if agreed); "A PDF invoice will not be considered an e-invoice" (BDO 02.01.2026). Channels: e-path providers, direct exchange, PEPPOL, miniBlagajna (OZS).
- **Reverse charge**: 76.a ZDDV-1 for construction services between VAT registered persons.
- **eGraditev**: from 5.1.2029 business with the administrative bodies only electronically through eGraditev (gov page). The electronic construction diary details were not confirmed on the official page.

### EU
- **A1**: employer requests it from the home institution before the posting; max 24 months on one A1; prior declaration to the host country authorities before or at the start (Your Europe, last checked 30.09.2026).
- **ESSPASS**: Commission proposal 15.09.2026: A1 to be digitalised first, one year after the ESSPASS Regulation enters into force (proposal stage, no date yet).

### Which hooks are strong enough to lead with

| Prospect | Lead hook (in this order) | Why it is strong |
|---|---|---|
| Austrian EPC with SI crews (Salzburg) | 1. **Kontrollmappe**: the inspection folder on the crew phone (A1, ZKO, hours) because LSD-BG §§ 21, 22 accept electronic access, fines up to 20,000 or 40,000 EUR. 2. **HFU and 25 / 40 percent checked at payment**, with a record of the check. 3. Regie clock on **ÖNORM B 2110** (2 weeks), not VOB/B. | Each is a statute with a euro amount and a moment where the app produces the proof. |
| German EPC | 1. **"Gültig am Zahltag"**: Freistellungsbescheinigung present at payment is the § 48a Abs. 3 defence, else 15 percent liability. 2. **MiLoG**: surety for sub and sub-sub wages, and up to 500,000 EUR fine for negligent ignorance; Belin holds the diligence trail (time records, declarations). 3. § 15 VOB/B 6 Werktage clock. | Money, named paragraph, and the GTM base rule "in Germany name the paragraph". |
| Slovenian EPC | 1. The money lost in hour and Nachtrag disputes (GTM base, `market-icp-si.md` section 2). 2. Building in AT and DE: the same tool covers posting and liability there. 3. 1.1.2028 PDF invoices stop being invoices: Belin already builds the invoice from approved data, structured export is roadmap (do not claim it exists). | SI has no VOB style statute, so lead with the argument it prevents. |

**Weak hooks, do not lead with:** German or Austrian e-invoicing for the SI to AT or DE pilot (domestic mandate does not bind cross-border); "subs free" (everyone says it); "KI" (the K2 parse is deterministic; claiming AI is a credibility risk); "only tool with a VOB clock" (CraftedEX claims it).

---

## 3. Findings on Belin's own public surface (evidence based)

### B1. Real company on public documents and in the demo (blocker if the prospect is Slovenian, high otherwise)
- `scripts/seed-demo.mjs:143` names the demo EPC "Sonce Energija d.o.o.", a real ZSFV member (`docs/gtm/knowledge/market-icp-si.md:51`, `docs/gtm/INDEX.md:53` forbids public use).
- `components/landing/Story.tsx:106-108` serves `doc-report.webp`, `doc-abnahme.webp`, `doc-invoice.webp` on every locale; all three print "Sonce Energija d.o.o." (`shots/sheet-sl.png`).
- Fix: rename the EPC in the seed to a fictional, AJPES-checked name, re-seed (one database for local and production, so schedule it), re-shoot the landing and brochure images. About 1.5 h.

### B2. Real private customer name and address on the landing, plus a visible bug (high)
- `public/landing/wizard-review.webp` shows "Planung Engelmeier", "Oberlaaer Str. 88", "1100", "Wien", with **Država SI** and Jezik SL, and an English "dd/mm/yyyy" placeholder (`shots/wizard-review-top.png`). The source is a real K2 report for customer Christian Engelmeier by Lumix Solutions GmbH (`tests/fixtures/k2/text/planung-engelmeier.pages.json:4`). Also a 14.85 kWp house roof on a page that sells commercial work.
- Fix: re-shoot the review screen from a fictional C&I plan (or an AVESOL-owned one, with permission), country correct. About 1 h.

### B3. German and English landing show Slovenian product and documents (high)
- `/de` and `/en` load the Slovenian doc images (`paper.mjs` output) and the Slovenian hero laptop ("PSE Trgovski center Kranj", "Dnevni tempo", `shots/splash-4500.png`). German document images exist unused in `public/landing/*-de.webp`.
- Fix: locale keyed image map in `components/landing/Story.tsx` and `app/[locale]/page.tsx`, German hero and dashboard shots. About 1.5 h.

### B4. No demo or pilot CTA; the loudest button is the login (high)
- Live `/de`: the gold pill "App öffnen" and bottom "Anmelden" both go to `/de/login`; the only other path is `mailto:info@getbelin.com` (`splash.mjs` output). Every captured competitor leads with demo or trial.
- Fix: hero primary "Pilot anfragen / Demo vereinbaren" (prefilled mailto or booking link), secondary "Live ansehen", login demoted to a nav text link. About 1 h.

### B5. Launch splash hides the landing for seconds (high)
- `components/SplashGate.tsx` is mounted in `app/[locale]/layout.tsx:138`, so it plays on landing, login and invite. On an emulated weak mobile link the Belin hero headline becomes visible at **6.1 s** while the page loaded at 1.8 s; Tenera 1.6 s, NachweisHub 3.8 s (`perf.mjs` output). Plays again on revisit (`shots/splash-revisit-1200.png`).
- Fix: show the splash only for the installed PWA. Keep server and client markup identical (the comment in SplashGate warns about hydration mismatch) and hide it with CSS `@media not (display-mode: standalone)` instead of a JS condition. About 0.5 h.

### B6. Functions run in Washington, not Frankfurt (high)
- Live headers: `X-Vercel-Id: fra1::iad1::...` on `/de` and `/de/login`. Vercel docs: default function region for new projects is iad1, Washington D.C. No `vercel.json`, no `preferredRegion` in the repo. Every server render crosses the Atlantic twice to reach Supabase Frankfurt, and the landing's "Daten in der EU, Frankfurt" covers storage only.
- Fix: set Function Region fra1 in Vercel project settings (or `vercel.json` `"regions": ["fra1"]`), redeploy, confirm `fra1::fra1`. 0.25 h. Vercel is DPF certified, so this is about latency and claim accuracy, not legality.

### B7. No Impressum and no privacy policy (high for DACH)
- `lib/legal.ts` OPERATOR fields are null by design; `/de/impressum` returns 404; footer shows no legal links. § 5 DDG requires one for commercial digital services.
- Fix: founder provides the operating entity; fill `lib/legal.ts`. 0.5 h after the data arrives.

### B8. The Regie clock is German law on Austrian and Slovenian projects (high if the prospect is Austrian)
- `lib/hours-shared.ts:3-20`: one rule, 6 Werktage per § 15 VOB/B, for si, de and at alike (only holidays differ). Austrian contracts typically agree ÖNORM B 2110: 7 day submission, 2 week objection, OGH 9 Ob 19/15g.
- Fix: per project "Vertragsgrundlage" (VOB/B, ÖNORM B 2110, individuell) with a rule table; AT default ÖNORM; badge "fristgerecht eingereicht"; labels name the right norm; tests. About 3 to 4 h. Minimum for tomorrow: do not show an AT project with a VOB/B label.

### B9. No proof band, no trust band, generic hero (medium)
- Belin hero: "Ihr Projekt an einem Ort", no proof, trust only in the footer line. Competitors: pain-named hero, proof band, one-line trust facts.
- Fix: a founder-proof band (AVESOL: real MWp, real photos from `assets/marketing/site/`), a trust row that is TRUE: database in Frankfurt on Supabase (ISO/IEC 27001:2022 since 22.04.2026, SOC 2 Type 2), processing in Frankfurt (after B6), AVV on request, "each company sees only its own data". About 1.5 h.

### B10. No pricing or pilot offer exists anywhere in the repo (medium)
- grep of `docs/` finds no Belin price. Market anchors above. The meeting needs an offer.
- J proposal: pilot free **until the Abnahme of one real project** (not 14 or 30 days: a commercial roof runs weeks), subs free forever, founding customer price fixed for 24 months. Price anchor J: flat per EPC in the range of PlanRadar Starter for 3 to 5 users (89 EUR per user per month) and above Freistellungsmanager Professional (79 EUR per month for one document type). Founder decides the number.

### B11. App store expectation (medium)
- Every field tool shows store badges. Belin is a PWA, the landing does not say so. Fix: "Ohne App Store: Link öffnen, auf den Homescreen legen" plus a QR code to a live crew demo. 0.5 h.

### B12. E-invoice question will come (medium for DE, low for tomorrow)
- No XRechnung, ZUGFeRD or e-SLOG output in the code (grep finds only plan notes in `docs/superpowers/specs/2026-07-19-v1-ship-everything-design.md:42`). Answer for the meeting: cross-border pilot invoices are not covered by the DE domestic mandate; structured export is on the roadmap before 2027 (DE above 800k) and 2028 (SI, DE all). Build later: 6 to 10 h.

---

## 4. Ideas the founder would not come up with (each tied to a source)

1. **"Gültig am Zahltag" payment check with a Prüfprotokoll PDF.** When the EPC approves an invoice, Belin checks the vault for the payment date: Freistellungsbescheinigung valid (DE, § 48a Abs. 3 defence), HFU status confirmed by the user with date (AT, liability removed only if listed at payment), A1 valid for every crew member on the logged days. It writes a timestamped one-page PDF to the invoice. Demo: the EPC clicks "Zahlung freigeben", gets a green protocol, or a red banner "15 % einbehalten". 4 to 6 h.
2. **Kontrollmappe** on the crew phone: one button "Kontrolle" shows, in German, per worker on site today: A1, ZKO notification, hours from the daily logs. LSD-BG §§ 21, 22 accept electronic access at inspection. Demo: hand the phone across the table: "this is what the Finanzpolizei sees". 3 to 5 h (read-only page over existing vault and logs, offline cache later).
3. **Haftungsrechner** on the landing and as a dashboard tile: enter subcontracted volume, see exposure: AT 25 percent (40 percent for leasing since 2026), DE 15 percent Bauabzugsteuer, plus the MiLoG 500,000 EUR ceiling as text. Demo: 120,000 EUR montage contract becomes "30.000 EUR offen, solange die HFU-Prüfung fehlt". 2 to 3 h.
4. **The prospect's own phone as the demo.** QR code on the laptop, the Bauleiter files a 30 second report on his own phone, the dashboard updates live in front of him. Needs a dedicated demo project and a reset afterwards (one database). 1 to 2 h prep.
5. **Pilot until Abnahme** instead of a 14 or 30 day trial (market windows above). A trial ending mid-project is a reason to say no; a pilot that ends with the signed Abnahmeprotokoll ends on the product's best moment. J.
6. **Role split on the landing** like NachweisHub: "Ich bin EPC" goes to the pilot offer, "Ich bin Montagebetrieb" goes to "kostenlos, für immer, Ihr Nachweis-Pass für alle Auftraggeber". 1 h.
7. **No-login live demo**, like Freistellungsmanager's "Live-Demo ohne Anmeldung testen": a read-only public view of the staged project. 3 to 4 h (needs a read-only guard, never the DEMO_LOGIN write path in production).
8. **Vault parity for Germany**: add § 13b certificate (validity up to 3 years), BG BAU and SOKA-BAU Unbedenklichkeit, Meldeportal-Mindestlohn confirmation, Mindestlohnerklärung to `lib/vault-shared.ts` VAULT_TYPES. The competitors list these (conova24, EIBEX, NachweisHub, Tenera). 1 to 2 h plus i18n.
9. **Slovenian DSO application prefilled from the K2 plan** (vloga za soglasje za priključitev): the repo already fills Elektro Gorenjska's real form in `scripts/marketing/vloga.mjs`. Moving it in-app makes "zero data entry" concrete for a Slovenian EPC. 4 h for one DSO.
10. **Commissioning protocol (IEC 62446-1 Strangmessprotokoll)**: the solar execution tools offer commissioning protocols (TabTool, COMP4), and the Salzburg deck already promised it (`docs/sessions/2026-09-16-salzburg-epc-presentation.md:70`). 4 to 6 h.
11. **"Ihre Daten gehen mit Ihnen"**: one-click ZIP export of a project (all PDFs, photos, CSV of hours). Removes lock-in fear. J. 2 to 3 h.

---

## 5. Unverified

- Whether tomorrow's prospect is the Salzburg (AT) EPC, a German or a Slovenian one: decides which hooks lead and whether B8 is a blocker.
- Capmo's "mid four-digit" entry price: period (year?) not stated on the fetched page.
- OpenSolar free core and paid API since 16 April 2026: secondary sources only.
- § 16 MiLoG notification fine of up to 30,000 EUR: from a summary of the statute page, not a verbatim quote.
- Whether § 67a ASVG Auftraggeberhaftung reaches a foreign sub whose posted crew are insured at home under A1; no source found.
- Whether SOKA-BAU and § 28e Abs. 3a SGB IV apply to PV montage (depends on Baugewerbe classification).
- Austrian 2026 AGH extension: BGBl number not found.
- Slovenian e-construction-diary details inside eGraditev and dates: not on the official page fetched.
- Slovenian equivalent of a deemed-acceptance rule for hour sheets (Posebne gradbene uzance): not researched.
- Reonic showed a Slovenian language prompt to this visitor; no Slovenian locale found in its hreflang list.
- Whether any competitor publishes the combination "SI crews on AT or DE roofs end to end": absence on 15 sites is not proof.
- Whether `PSE Trgovski center Kranj, Cesta Staneta Žagarja 69` is a real building.
