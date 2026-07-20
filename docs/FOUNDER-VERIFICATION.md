# Things only the founder can verify

Some things cannot be proven from this machine. An email can be accepted by the sending service and still land in spam. A screen can be correct in a headless browser and still feel wrong in one hand on a roof in the sun. Slovenian can be grammatical and still read like a translation.

This file lists exactly those things. Everything on it has been built and, where possible, checked at the level a machine can check; what remains is the part that needs your eyes, your phone, your inbox or your judgement.

Tell me when you have checked something and I will mark it done here, with the date.

Status: `[ ]` open, `[x]` verified by the founder.

## Email, delivery and wording

- [ ] **The login email actually arrives.** I confirmed Resend accepted it and returned a delivery id, which is not the same as it reaching your inbox. Check it arrives, and check whether it lands in spam or in the promotions tab.
- [ ] **The login email looks right in a real client.** Open it in whatever you and your customers actually use, at least Outlook and a phone. The design is a table with inline styles precisely because those clients break anything fancier, but only a real client proves it.
- [ ] **The invitation email arrives and reads well.** Same as above, plus: does the sentence "{company} vas vabi k sodelovanju na projektu {project}" sound like something a Slovenian EPC would send?
- [ ] **Sender reputation.** Watch for bounces or spam complaints on getbelin.com over the first real sends. A cold domain can start fine and degrade.

## Slovenian language and tone

- [ ] **Every new string reads like a person wrote it.** Login, the confirm screen, the project list, the subcontractor home, settings, and the invitation screens. You are the native speaker and the one who knows how these companies talk; I can only guarantee consistency, not that it sounds right.
- [ ] **Vikanje is consistent.** Everything ships in vikanje. Flag anything that slipped into tikanje.
- [ ] **Trade vocabulary.** Especially: naročilnica, režijske ure, nadgradnje, prevzem, manki, podizvajalec, vodja gradbišča. If the trade says something different, the app should say what the trade says.

## On a real phone

The preview browser here reports itself as permanently hidden and cannot screenshot reliably, so motion and feel are unverifiable from this machine by design.

- [ ] **The crew flow is under 30 seconds, one handed.** This is design law 1 and the only test that matters is you doing it on a phone, ideally outside.
- [ ] **Animations and transitions feel right.** Reveals, the status control, the command bar.
- [ ] **The subcontractor office home looks right on a phone.** It is new and has never been seen on a real device.
- [ ] **The settings and invitation screens on a phone.** The invitation screen is what a brand new customer sees first, so it carries more weight than its size suggests.
- [ ] **iOS status bar and PWA install.** Previously fixed after three attempts; worth confirming it stayed fixed.
- [ ] **Weak rural LTE.** The stated constraint is fast on a bad connection. Try it somewhere with one bar.

## The whole loop, as a customer would live it

- [ ] **Two real accounts, two sides.** Invite a second real address of yours as a subcontractor, accept it in another browser, and drive both sides. Every seeded demo address (Matej, Luka, Ana) is deliberately fake and will never receive mail, so this is the only way to feel the real two-sided flow.
- [ ] **Your own K2 exports.** Five of your reports are fixtures and parse correctly, but you have more. Throw awkward ones at the wizard: old versions, English exports, reports without an article list.
- [ ] **The demo still demos.** The shared password login is gone from the live site, so anyone you previously demoed to with 12345 cannot get in. Confirm this does not break a demo you have planned before the pilot.

## Judgement calls I made that you may want to overrule

- [ ] **A new colleague defaults to Bauleiter, not admin.** Admin can spend money and change the IBAN, so I made the larger grant deliberate. If your reality is that everyone in the office is an admin, say so and I will flip the default.
- [ ] **The subcontractor cannot invite anyone by email.** Their crew gets a shared link instead, on the theory that a roofer should not need an account. If subs ask for named crew accounts, that assumption needs revisiting.
- [ ] **A Bauleiter cannot reach settings at all.** Currently they cannot see or change company details, invite anyone, or later touch the IBAN. If your Bauleiter is expected to run the office too, this is too strict.
- [ ] **Login links last 15 minutes and sessions last 30 days.** Both are guesses at what will not annoy people.
- [ ] **VAT mode is reverse charge on the demo projects.** Domestic Slovenian construction services under 76.a ZDDV-1. Your accountant is the authority here, not me.

## Known gaps I am not asking you to verify, because they are mine to fix

These are recorded so they are not forgotten, not because they need you.

- The direct server-action authorization probe was inconclusive (the test request was malformed for admin too, so it proved nothing). A proper automated authorization test is owed before real customer data goes in.
- An abandoned wizard run still leaves its uploaded file in storage. Cleared by hand once; needs a real cleanup path.
- German and English are placeholder Slovenian everywhere by mandate. Task J3 is the single deliberate translation pass.
- The service role key should be rotated before the pilot.
