# Recon: landing page and every public, signed-out surface

Key: landing. Date: 2026-10-05. Read only. Evidence folder:
`C:\Users\ejand\AppData\Local\Temp\claude\C--DevEnv-belin-app\fc02d7f1-c666-4861-aeb4-7e5eac16051f\scratchpad\recon\landing\`
(shots in `shots\`, asset contact sheets in `assets\`, scripts `shoot.mjs`, `perf.mjs`, `slice.mjs`, `sheet.mjs`, raw numbers in `local-perf.json`, `prod-perf.json`, `local-shoot-log.json`, `prod-shoot-log.json`).

## Summary

The landing page itself is light (451 to 481 KB on production), dark, competent and looks roughly 2024 grade. It is not the problem tomorrow. Four things around it are, and three of them would fail in the room:

1. **The Supabase project is PAUSED.** `get_project` returns `status: INACTIVE`, the org is on the Free plan, and `xrwncpngjajosstvkign.supabase.co` no longer resolves in DNS. Every database page is down locally and on production: `/sl/p/demo-epc-k7m2x9q4` returns 404 after 7.5 s on production, and the login form answers "link sent" while nothing is sent. Only the landing renders, because a signed-out visitor costs no DB round trip. The founder must press "Resume project" (or approve a restore), then upgrade to Pro or the project pauses again after 7 quiet days.
2. **getbelin.com, the domain printed on every generated PDF footer, the share card, the video end card, the brochure, the emails and the landing's own mailto, serves the OLD Belin 1.0.0 product.** It shows a different logo, "Every kWh starts here", `€50M+ Solar projects managed`, a "Trusted by solar companies across Europe" strip naming SolarTech GmbH, GreenPower AG, SunWorks Inc, EcoInstall and BrightSolar, and pricing at €0, €50 and €200 a month. It lives on Vercel project `belin-swsc`, and `app.getbelin.com` sits on project `belin`. A prospect who types the domain off a PDF meets fabricated social proof.
3. **The public landing publishes third-party data.** Section 01's screenshot shows a real private customer's project and home address from a real K2 report ("Planung Engelmeier", Oberlaaer Str. 88, 1100 Wien; the fixture names the Kunde, Christian Engelmeier). All three document images show Sonce Energija d.o.o., a real ZSFV member the GTM base forbids showing publicly, plus AVESOL's demo rate (118.500 EUR for 245,7 kWp). The same screenshot also shows the old Wien-as-SI country bug.
4. **Every visit opens on a 4.3 second splash** ("BELIN SOFTWARE") that covers the landing and the login page. On a throttled Fast 3G phone, a production visitor sees only the logo animation at 2, 4 and 6 s, and the page first appears at about 6.9 s (filmstrip). The page under the splash first paints at about 2.5 s.

The landing also has structural gaps against a 2026 B2B standard:
- **No call to action reaches a person.** "Uporabi aplikacijo" and "Prijava" lead to a magic-link login, and that login silently does nothing for an unknown email (`app/actions/auth.ts:85`).
- **No problem framing, no offer, no pilot, no FAQ, no "who is behind it", no Impressum.** The legal pages 404 by design until `lib/legal.ts` is filled.
- **The German page shows Slovenian screenshots and Slovenian documents**, although German versions sit unused in `public/landing/`.

The founder's own brochure (`lib/pdf/brochure-copy.ts`) and the Salzburg deck (`public/p/salzburg.html`) already contain a much stronger pitch, a pilot offer and real site photography. The new landing should be assembled from them rather than written fresh.

## Hard evidence log

| What | Evidence |
|---|---|
| Supabase paused | Supabase `get_project(xrwncpngjajosstvkign)`: `"status":"INACTIVE"`; `get_organization`: `"plan":"free"`; `nslookup xrwncpngjajosstvkign.supabase.co 8.8.8.8`: Non-existent domain; `execute_sql` timed out twice; supabase-js select: `TypeError: fetch failed`; curl `https://belin-app.vercel.app/sl/p/demo-epc-k7m2x9q4`: 404 in 7.46 s; locally both demo tokens 404 after ~7 s. Pausing rule verified at https://supabase.com/docs/guides/platform/free-project-pausing (accessed 2026-10-05): Free projects pause after low activity over 7 days, restorable for 90 days, Pro plan is never paused. Pro is $25 per month with $10 compute credits covering one Micro project (https://supabase.com/docs/guides/platform/manage-your-usage/compute, accessed 2026-10-05). |
| getbelin.com is the old product | Vercel `list_project_domains(belin-swsc)`: getbelin.com (redirect to www) and www.getbelin.com; `list_project_domains(belin)`: app.getbelin.com; `list_project_domains(belin-app)`: only belin-app.vercel.app. `curl https://www.getbelin.com/` title "BELIN, Where Solar Gets Done" (the site uses a dash there); body text includes "TRUSTED BY SOLAR COMPANIES ACROSS EUROPE", "€50M+", "Solar projects managed", "€0/mo", "€50/mo", "€200/mo", "Join the solar companies already running on BELIN." Screenshot `shots/getbelin-com-fold.png`. getbelin.com is printed at `lib/pdf/theme.tsx:288` (every PDF footer), `components/landing/Story.tsx:136` (mailto), `components/legal/LegalPage.tsx:68`, `lib/email-shared.ts:65` (every email), `lib/pdf/brochure.tsx:216,383`, `scripts/marketing/og.mjs:89` (share card, visible in `public/og/belin-sl.jpg`), `scripts/marketing/video-cut.mjs:126` (video end card, `assets/video-tiles.png`). |
| Resend sending domain | Resend connector `list-domains`: getbelin.com `Status: failed` (created 2026-02-13), avesol.si verified. `get-domain`: DKIM `resend._domainkey` failed; `nslookup -type=TXT resend._domainkey.getbelin.com 8.8.8.8`: Non-existent domain. App sender `lib/email.ts:19` is `Belin <obvestila@getbelin.com>`. This Resend account lists no Belin app sends at all, so the app's RESEND_API_KEY may belong to another account (UNVERIFIED). |
| Real customer address on landing | `public/landing/wizard-review.webp` (crop `assets/wizard-top.png`): Naziv projekta "Planung Engelmeier", Ulica "Oberlaaer Str. 88", 1100 Wien, Država "SI". `tests/fixtures/k2/text/planung-engelmeier.pages.json:4`: "Kunde Christian Engelmeier, Projektadresse Oberlaaer Str. 88, 1100 Wien". `tests/k2-metadata.test.ts:231`. CHANGELOG.md:148 "the K2 review step with a real Austrian plan read into it". Rendered on the landing in `components/landing/Story.tsx:36`. |
| Real EPC name and demo rate on landing | `assets/doc-invoice.png` (from `public/landing/doc-invoice.webp`): Prejemnik "Sonce Energija d.o.o.", 118.500,00 EUR, total 120.372,00 EUR. Same company on `doc-report.webp` and `doc-abnahme.webp` (`shots/local-landing-sl-desk-full-s3.png`). GTM rule: `docs/gtm/INDEX.md` "Standing constraints": "The demo seed names a real ZSFV member company (Sonce Energija d.o.o.) as its EPC. Must be renamed before any public asset shows it." DECISIONS.md:19 on not handing a prospect AVESOL's rate. |
| Splash on every public page | `app/[locale]/layout.tsx:138` mounts `<SplashGate />` for every locale route; `components/BelinSplash.tsx:46-50`: END 3.05 s + HOLD 0.6 s + 600 ms fade; fixed overlay z-index 9999 with no pointer-events none (`:131-142`). Measured (`prod-perf.json`): desktop unthrottled splash gone at 5643 ms, phone unthrottled 5233 ms, phone Fast 3G 6892 ms with FCP 2532 ms. Filmstrip `shots/prod-fast3g-filmstrip.png` (2 s, 4 s, 6 s splash; 8 s page). Splash reads "BELIN SOFTWARE" although the 2026-09-08 lockup commit 4557a2e dropped SOFTWARE. |
| Weight | Production `/sl`: desktop 25 requests, 480.8 KB (images 179 KB, JS 127 KB, fonts 131 KB, CSS 24 KB, HTML 20 KB); phone 451 KB. Largest single file: Inter latin-ext 83.4 KB. Images via `/_next/image` webp: hero-laptop 37 KB, doc-report 34 KB, doc-invoice 30 KB, crew-phone 23 to 29 KB, abnahme 22 KB, wizard 13 to 19 KB, hero-phone 11 KB, dashboard 9 to 12 KB. Local dev: 2.5 MB, but 2.1 MB of that is unminified dev JS (`local-perf.json`), not representative. No console errors on any landing load. |
| Stranger login dead end | `app/actions/auth.ts:85`: `if (!person || !person.email) return { sent: true };` so an unknown address shows "Povezava za prijavo je poslana. Preverite e-pošto." (`messages/sl.json` auth.linkSent) and nothing arrives. GTM INDEX: "The login screen is a dead end for strangers: there is no self-serve signup, so any public call to action must route to a person, not to the app." The landing CTAs: `app/[locale]/page.tsx:62` (header) and `components/landing/Story.tsx:133` (closing "Prijava"). The closing copy promises "Naložite načrt in v nekaj minutah vidite, kako izgleda." (`messages/sl.json` landing.ctaBody). |
| German page shows Slovenian assets | `components/landing/Story.tsx:36,56,57,106-108` and `app/[locale]/page.tsx:105,114` hardcode the Slovenian files; `public/landing/doc-*-de.webp` exist and are unused. Screenshot `shots/local-landing-de-desk-full-s3.png` shows "Papierkram? Erledigt." over "Zaključno poročilo", "Zapisnik o prevzemu", "Račun". The hero on /de shows "PSE Trgovski center Kranj, Pregled projekta, Dnevni tempo". |
| Legal pages | `lib/legal.ts:43-55` all operator fields null except email, so `legalPublished()` is false, `/sl/impressum` and `/sl/zasebnost` return 404 (local and production), and `LegalLinks` renders nothing. The 404 page shown there is `app/[locale]/not-found.tsx`: a WHITE card glued to the top edge on the dark page, saying "Povezava ni veljavna. Ta povezava do projekta ne obstaja ali je bila preklicana." (`shots/local-zasebnost-sl-phone-fold.png`), which is the wrong message for a legal page, with no link home. |
| Unmatched URL 404 | `/sl/nekaj-ne-obstaja` on production renders the default Next.js white "404 This page could not be found." in English, title "404: This page could not be found." (`shots/prod-notfound-sl-phone-fold.png`). |
| SEO files | Production: `/robots.txt` 404, `/sitemap.xml` 404, `/favicon.ico` 404, no `<link rel="icon">` in the head (only apple-touch-icon), so the browser tab shows a generic icon. Present and correct: per-locale title and description, canonical, hreflang sl/de/en (no x-default), og:image 1200x630 absolute, twitter card (`prod-sl.html`). og:locale is "sl", not "sl_SI". No JSON-LD. |
| Stale assets | Crew tab bar landed 2026-08-13 17:34 (fdd00f9). The landing crew shots are older: `public/landing/crew-phone.webp` is from 08:59 and hero-phone from 16:19, so both show the pre-tab-bar crew screen ("Prijavi zaplet / Zahtevaj / Pošlji poročilo", no tabs). The German set from 2026-08-31 (`assets/marketing/mockups-de/phone-crew-flat.png`) and the video (`assets/video-tiles.png`) show the current tabs. |
| Header on phone | `app/globals.css` `.lp-wm { display: none; }` in the narrow media block, so the word BELIN never appears in the phone header (`shots/local-landing-sl-phone-full-s0.png`). |
| Local login with DEMO_LOGIN | `shots/local-login-sl-desk-fold.png`: "UPORABNIŠKO IME" label sits flush under "Pošlji povezavo" with no gap or divider. Local only: production has no password form (`shots/prod-login-sl-phone-fold.png`). |

## current_state: the page as it is, section by section (production /sl, 1440x900 and 390x844)

0. **Splash** (every load, 4.3 s minimum): rising gold mark, "BELIN SOFTWARE". Blocks the page.
1. **Header** (not sticky): mark plus "BELIN" (the word is hidden on phone), SL DE EN pills, gold "Uporabi aplikacijo" to /sl/login. No nav anchors.
2. **Hero** (`app/[locale]/page.tsx`): eyebrow "SOLARNA GRADBIŠČA"; H1 "Vaš projekt na enem mestu: od predaje do izvedbe in zaključka." (the founder's headline from 2026-08-13); a subtitle restating the feature list; three bullets (30 s report, EPC sees live progress, documents write themselves); laptop plus phone mockup of "PSE Trgovski center Kranj 58%". No button inside the hero, no secondary action, no trust line. The phone mockup is unreadable at hero size, and the crew screen in it is outdated.
3. **01 / NAČRT** "Naložite načrt. Projekt se izpolni sam.": text left, K2 review screenshot right. The screenshot shows a real customer's name and address, and SI for Wien. On phone the screenshot text renders around 5 px and is illegible.
4. **02 / VSAK DAN** "30 sekund na dan.": centered text, then the crew phone (old UI, WhatsApp status bar) next to the EPC dashboard. Aside: "En palec, ena roka, tudi na slabi povezavi."
5. **03 / TRENUTKI RESNICE**: three text-only cards (Zapleti, Režijske ure, Manjkajoč material). No icons, no visuals, no numbers.
6. **04 / ZAKLJUČEK** "Papirologija? Narejena.": three real PDF crops fanned (report, Zapisnik o prevzemu, Račun), all naming Sonce Energija and the rate. Not clickable, no sample download. Phone: a horizontal scroller with the second sheet cut at the edge.
7. **Compliance strip** "Za nemška in avstrijska gradbišča": A1 plus Freistellungsbescheinigung, reverse charge, data in Frankfurt.
8. **Closing CTA** "Pokažite nam svoj naslednji projekt. Naložite načrt in v nekaj minutah vidite, kako izgleda.": gold "Prijava" (to login, a dead end for strangers) and "Pišite nam" (mailto:info@getbelin.com).
9. **Footer**: "Podatki v EU, Frankfurt. Slovensko, nemško, angleško." There are no legal links (hidden), no company, no address, no phone, no ©.

Missing entirely: the problem and cost framing, who pays (EPC pays, subs free), the pilot offer, any pricing posture, a "who is behind it" block, social proof of any honest kind, FAQ, a live demo, sample documents, a booking path, a sub-facing argument, real site photography, video.

Other public surfaces:
- `/login`: clean card. It offers no path for someone without an account. Production shows the magic link form only (`shots/prod-login-sl-phone-fold.png`).
- `/auth/verify/<bogus>`: renders the confirm card (validation happens on submit). Consistent styling.
- `/invite/<bogus>`: "Povabilo ni veljavno ali je poteklo" with "Na začetno stran". Consistent.
- `/p/<token>`: currently 404 because the DB is paused.
- `/p/salzburg.html`: a public deck, noindex, 3.9 MB, loads in 0.47 s on a fast line. Its first screen is stronger than the landing: full-bleed roof photo, "Wir montieren. Sie sehen alles. Die Akte schreibt sich selbst.", chips "Für Sie kostenlos" and "4 Minuten" (`shots/prod-salzburg-fold.png`).
- Unknown URLs: the default English Next.js 404.

## Marketing asset inventory (opened and looked at; contact sheets in `assets\`)

### public/
- `landing/hero-laptop.webp` 1800x1082: angled laptop with the EPC dashboard of PSE Trgovski center Kranj at 58%, "Predviden zaključek 25.08" (now in the past). Current dashboard design. Slovenian. OK only after the demo EPC is renamed.
- `landing/hero-phone.webp` 1100x888: angled phone, crew screen, pre-tab-bar. STALE.
- `landing/crew-phone.webp` 738x1600: crew screen shot on a real phone arriving from WhatsApp, pre-tab-bar, URL pill belin-app.vercel.app. STALE UI. The "link in WhatsApp, no account" message now contradicts the crew email login decision of 2026-08-13.
- `landing/epc-dashboard.webp` 1800x881: EPC dashboard crop, Slovenian. Current design.
- `landing/wizard-review.webp` 1500x1354: K2 review with a real customer's name and address and SI for Wien. MUST BE REPLACED.
- `landing/doc-report|doc-abnahme|doc-invoice.webp` 920 wide: Slovenian document crops naming Sonce Energija, with the 118.500 EUR rate. MUST BE REPLACED for public use.
- `landing/doc-*-de.webp`: German crops naming the fictional "Nordsonne Energie GmbH", Ingolstadt, same amounts. Unused on the page. The invoice shows a Slovenian-format VAT ID (SI10000001) for a German GmbH, which a German reader may notice.
- `og/belin-sl|de|en.jpg` 1200x630: headline, laptop plus phone mockup, "getbelin.com". The URL points at the old site.
- `icons/*`: apple-touch 180, 192, 512, maskable, logo.svg and logo-transparent.svg (mark). Fine. No favicon is wired.
- `fonts/InterVariable.ttf` 880 KB: for the PDF renderer, not served to the landing.
- `p/salzburg.html` 3.9 MB: German deck for a Salzburg EPC, real photos, noindex.

### assets/marketing/
- `hero/laptop.png`, `hero/phone.png` (3.7 and 4 MB): the founder's mockup-tool masters of the hero. Phone is pre-tab-bar.
- `mockups/` (2026-08-13, Slovenian): three document sheets (Sonce Energija), `laptop-dashboard-left` (EPC dashboard), `laptop-portfolio-right` (EPC portfolio: 1 active, 491 and 265 kWp tiles, 7 project cards; a strong unused "all your sites" visual), `phone-crew-flat` and `phone-crew-left` (pre-tab-bar), `phone-join-right` ("Prijava na gradbišče" crew join, current flow). Mixed currency.
- `mockups-de/` (2026-08-31, German, fictional Nordsonne Energie GmbH, PV-Anlage Logistikzentrum Ingolstadt): Abnahmeprotokoll, Rechnung, Abschlussbericht, dashboard, portfolio, `phone-crew-flat` and `phone-crew-left` WITH the current tab bar (Übersicht, Melden, Bautagebuch, Stunden), and `phone-join-right` "Anmeldung zur Baustelle". The most current and the only publicly safe product set.
- `framed/` (2026-08-13, Slovenian, flat in browser and phone frames): crew-join, crew-phone (pre-tab-bar), epc-dashboard, epc-dashboard-days (incidents, documents), hours-countdown (Regiestunden list with the countdown), portfolio, settings-roster. The roster shows `http://localhost:3000/sl/p/...` links and the copy "Brez računa in brez gesla". Not usable publicly.
- `framed-de/`: the German equivalents (2026-08-31). Not individually opened; same names and sizes as framed/, so presumably the same screens in German (UNVERIFIED per file).
- `docs/` (Slovenian full A4 renders): Zapisnik o prevzemu, Zaključno poročilo cover, Dnevno poročilo podizvajalca day page, Račun, Naročilnica. All name Sonce Energija; the naročilnica prints 118.500 EUR for 245,7 kWp.
- `docs-de/`: Abnahmeprotokoll, Abschlussbericht, Bautagesbericht, Rechnung (Nordsonne). `docs-de/narocilnica.png` is actually the SLOVENIAN naročilnica with Sonce Energija and must never be used (DECISIONS.md:19).
- `site/` (real AVESOL photography, masters): anlage-weit (wide commercial roof array), crew-arbeit and crew-module (near-identical frames of a hi-vis AVESOL crew laying modules on a metal roof with mountains behind; different bytes), crew-montage (crew carrying a module at dusk), crew-panel (two men in blue AVESOL jackets lifting a module against sky), dach-weit (flat gravel roof array between apartment blocks), dc-verkabelung (portrait, DC cable run between rows), flug-1, flug-2 and flug-3 (drone sequence of a ground-mount build: substructure, half done, finished; a ready-made "progress" storyboard), phone-melden.png (GERMAN crew screen crop "Tagesbericht / Bericht senden" with the current tab bar), unterkonstruktion (flat roof substructure). The strongest trust material in the repo, unused on the landing.
- `video/belin-demo.mp4` 40.5 s, 1920x1080, 3.5 MB: current crew UI with tabs, quantity steppers, dashboard 20% to 58% live, hours, documents; Slovenian captions; end card "getbelin.com". `belin-demo-9x16.mp4` 12 s, 1080x1920, 0.3 MB. Both silent in practice (2 kb/s audio).
- `brochure-pages/` (7 pages, Slovenian) and `brochure-pages-de/` (9 pages): the pitch with problem, daily loop, control, money, paperwork and pilot ("Prvi projekt je brezplačen"). Copy source: `lib/pdf/brochure-copy.ts`.
- `belin-predstavitev-sl.pdf`, `belin-vorstellung-de.pdf`: the brochure PDFs.
- `belin-workflow-sl.html` (untracked, 2.8 MB): internal workflow document, marked internal; must not be published (DECISIONS.md:5).
- `assets/brand/`: horizontal lockups (mark plus BELIN, no SOFTWARE) in dark, white and white-grey, SVG plus PNG; stacked lockups with SOFTWARE. Use `belin-h-*.svg` for a proper header and favicon.

## Section-by-section evaluation against a 2026 B2B SaaS standard for construction buyers

| Criterion | State | Verdict |
|---|---|---|
| Value proposition in 5 s | "Vaš projekt na enem mestu" is a category cliché used by every PM tool. It does not name the buyer (EPC who subcontracts montage), the pain (paperwork that holds money), or the outcome. | weak |
| Product shown | Yes, real screens, but crew screens are outdated and phone renderings are illegible on mobile | partial |
| How it works | Five-moment story is good structure, but no visual step timeline and section 03 is text only | partial |
| Documents | Shown as a fan. Not downloadable. Real third-party names on them | partial, unsafe |
| Trust (EU hosting, GDPR, who, Impressum) | One line about Frankfurt. No company, no person, no address, no Impressum, no privacy link (404) | missing |
| Honest social proof | None. Real AVESOL site photos exist and are unused | missing |
| Offer (EPC pays, subs free, pilot) | Not mentioned anywhere on the page | missing |
| CTA | Every button goes to a login that silently ignores strangers | broken |
| FAQ | None | missing |
| Footer | One line | weak |
| SEO and share meta | Share meta good; no favicon, robots, sitemap, JSON-LD | partial |
| Mobile | No horizontal overflow at 390, readable type, but brand word hidden, hero image below a full screen of text, screenshots illegible | partial |
| Speed | Page is light; splash adds 4.3 s to every visit | fails on perceived speed |
| Language | German page shows Slovenian product and documents | fails for DE |

## Findings, see the StructuredOutput for the full list with fixes and hours.

## New landing structure (ideas), Slovenian copy direction

Built from the founder's already approved brochure copy and the Salzburg deck. Keep the five-moment spine. Sections:

0. **Header, sticky with blur.** Lockup (mark plus BELIN, also on phone), anchors "Kako deluje, Dokumenti, Pilot, Vprašanja", SL DE EN, a quiet text link "Prijava", gold button "Dogovorite predstavitev". Purpose: one action always visible; existing users still find the door.
1. **Hero.** Purpose: buyer, pain and outcome in 5 s. Headline options:
   - (a) "Delo je narejeno. Denar se ne sme zatakniti pri papirju." (from brochure 01);
   - (b) "Vaši podizvajalci montirajo. Vi vidite vse. Papirji se napišejo sami." (Salzburg three-beat, in the EPC's voice).
   - The founder's line moves to the eyebrow or subtitle. Sub: "Belin povezuje EPC izvajalca in podizvajalce montaže sončnih elektrarn. Ekipa poroča v 30 sekundah, napredek se izračuna iz dejanskih količin, režijske ure imajo rok, zapisnik o prevzemu in račun nastaneta sama."
   - Primary "Dogovorite 25-minutno predstavitev"; secondary "Odprite živi projekt" (public read-only link, no login).
   - Trust line under the buttons: "Prvi projekt brezplačen. Podizvajalci vedno brezplačno. Podatki v EU, Frankfurt."
   - Visual: a real roof photo (site/crew-arbeit.jpg) with the product (current tab-bar phone plus dashboard) layered over it, not a floating laptop on navy.
2. **Problem: "Kje se izgubi denar".** The three moments from brochure 01 verbatim (Režijske ure čez dva meseca; Prevzem teden dni po prevzemu; WhatsApp in Excel). Optional, sourced market panel "Kaj se je spremenilo v 2025" (commercial segment down only 8 percent while residential collapsed; sourced in `docs/gtm/knowledge/market-icp-si.md`). Purpose: recognition.
3. **How it works, four steps on a timeline:** Načrt (K2 v 2 minutah), Vsak dan (30 s), Trenutki resnice (zaplet, ure z rokom, material), Zaključek (dokumenti). Each with ONE legible current screenshot, locale-aware.
4. **Live proof.** "Poglejte resničen projekt, brez prijave" opens a public read-only EPC dashboard of a fictional demo project; a QR code next to it for the meeting; a 12 s silent loop of the 9x16 video with preload none and a poster.
5. **Documents: "Papirologija? Narejena."** The five documents (naročilnica, dnevno poročilo, zaključno poročilo, zapisnik o prevzemu, račun) as cards, each with "Prenesite vzorec (PDF)", generated from the fictional demo project. Line: "To niso vzorci za prodajo. To so dokumenti, ki jih Belin ustvari iz poročil ekipe. Ostanejo vaši, tudi če Belin nehate uporabljati."
6. **Za vaše podizvajalce.** "Podizvajalec ne plača nič in se ničesar ne uči." Plus a white-glove promise: "Vaše podizvajalce uvedemo mi: 10 minut po telefonu." Purpose: kill the EPC's biggest adoption fear (my subs won't use it). Include the compliance passport (A1, Freistellungsbescheinigung).
7. **Varnost in skladnost.** Only verifiable claims: Supabase Frankfurt; no analytics and no tracking cookies (true per `lib/legal-copy.ts` header); documents exportable as PDF; rok šestih delovnih dni po § 15 (3) VOB/B; obrnjena davčna obveznost po 76.a členu ZDDV-1; trilingual documents in the project language.
8. **Kdo stoji za Belinom.** Founder photo, name, phone; "Belin je zgradila ekipa, ki sama montira sončne elektrarne" over real AVESOL site photos (only if the founder confirms that framing and the crew agree to their faces being used). Purpose: honest social proof without customers.
9. **Pilot: "Prvi projekt je brezplačen."** Brochure 06 verbatim: included list, "Kaj prosimo v zameno", next step "25 minut, vaš projekt na zaslonu". State the price posture: EPC plača mesečni pavšal po pilotu, podizvajalci nikoli. The number only if the founder decides.
10. **Vprašanja (FAQ), 8 items:**
    - Ali morajo podizvajalci plačati?
    - Kje so podatki?
    - Ali je dnevno poročilo gradbeni dnevnik? Honest answer per DECISIONS 2026-07-20: no, it is contractual documentation.
    - Kaj, če načrt ni iz K2?
    - Kaj, če ekipa nima signala?
    - Ali lahko dokumente izvozim?
    - Koliko časa traja uvedba?
    - Kaj se zgodi po pilotu?
11. **Final CTA.** Keep "Pokažite nam svoj naslednji projekt." with "25 minut, vaš K2 načrt na zaslonu, brez prosojnic." Buttons: booking (mailto with subject plus phone tel: link), "Pišite nam".
12. **Footer.** Operator name and address (Impressum), email, phone, Impresum, Zasebnost, languages, "Podatki v EU, Frankfurt", ©2026.

## Questions for the founder

1. Will you press "Resume project" on Supabase now, and upgrade the BELIN org to Pro (about $25 a month) so it cannot pause again before or after the meeting?
2. Can getbelin.com be moved from the old Belin 1.0.0 Vercel project to belin-app tonight (this takes the old site with the fake logos offline), or should it just redirect to belin-app.vercel.app for now?
3. Which company legally operates Belin (AVESOL d.o.o. or another entity)? The Impressum needs the legal name, address, representative and register number to go live.
4. What language is tomorrow's meeting in, and is the prospect Slovenian, Austrian or German? This decides whether the German landing must be fixed first.
5. May the landing show AVESOL crew faces and site photos and name AVESOL as the team behind Belin? Is it true that Belin has been used on AVESOL sites?
6. Will you state a price on the landing (EPC monthly flat), or only "first project free"?
7. What fictional EPC name should replace Sonce Energija in the demo seed and every document? (Nordsonne Energie GmbH is already used in DE.)
8. Do you want to keep your headline "Vaš projekt na enem mestu" as the H1, or move it to the eyebrow under a sharper problem headline?
9. Does info@getbelin.com receive mail today (MX is Hostinger)? Which phone number may be published?
10. Do you have a booking tool you already use, or is mailto plus phone enough?

## Unverified

- Which Resend account the app's RESEND_API_KEY belongs to, and therefore whether magic-link emails would send at all after Supabase is resumed (the connected account shows getbelin.com failed with the DKIM record missing in DNS).
- Whether the info@getbelin.com mailbox exists.
- Whether "Nordsonne Energie GmbH" is a real company.
- The current crew and EPC UI on the live app, since the DB is paused and signed-in screens could not be shot.
- `framed-de/` files were not opened one by one.
- Exact time a Supabase resume takes for this project.
