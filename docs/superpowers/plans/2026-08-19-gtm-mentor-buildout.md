# The GTM mentor buildout: how the repo learns to launch Belin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Phases 1 to 3 additionally require the research-first rule below; phase 5 requires superpowers:writing-skills.

**Goal:** Turn "how do I launch Belin" from a question I improvise plausible answers to into a discipline the repo carries: a sourced knowledge base, distilled into operational skills, wired into CLAUDE.md, producing documents, scripts, calendars, outreach plans and call frameworks that a solo non-developer founder can execute in Slovenia first and DACH second.

**What this plan is not:** it does not execute anything. No folder is created, no note is researched, no skill is written until the founder says go. This file is the whole deliverable of this session.

**Planned on Fable, for execution by Opus across several sessions.**

---

## Why a knowledge base instead of just answering better

Three reasons, all learned in this project the hard way.

1. **Confabulation is the failure mode of an eager generalist.** The FocuSee episode (recommended a Mac-only tool to a Windows founder, then guessed at its features) produced the standing founder mandate: research before advising. A knowledge base with sources and dates makes that mandate structural instead of aspirational: the mentor may only assert what a file in docs/gtm/knowledge can back, and must say "not yet researched" otherwise.
2. **Context does not survive sessions; files do.** Everything studied in a chat dies with the chat. The founding insight of this repo (HANDOFF.md, DECISIONS.md, session logs) applies to GTM knowledge identically.
3. **Skills are knowledge that acts.** A note about LinkedIn is trivia. A SKILL.md that takes a draft post and applies the researched rules to it, every time, without being reminded, is expertise. Skills are the final compression stage: notes are what I learned, skills are what I do.

## The architecture

```
CLAUDE.md                                  + ~8 lines: the GTM section, routing rule
docs/gtm/
  INDEX.md                                 what exists, what is stale, confidence legend
  knowledge/                               SOURCED notes, one field per file
    founder-groundtruth.md                 intake interview: his network, stories, hours, budget
    market-icp-si.md                       who can pay in Slovenia: counts, names, segments
    market-icp-dach.md                     same for DE and AT
    buyer-psychology-construction.md       how EPC owners actually buy tools
    competitor-gtm-history.md              how PlanRadar, Craftnote, Procore, ServiceTitan sold early
    channels-law-dach-si.md                THE GATE: UWG, TKG, ZEKom, GDPR outreach constraints
    channels-linkedin.md                   algorithm, formats, Sales Navigator mechanics and cost
    channels-cold-calling.md               what is legal and what works, per country
    channels-events.md                     fairs and gatherings: which, when, cost, how to work them
    channels-media-associations.md         trade press, associations, where trust is borrowed
    craft-founder-led-sales.md             Founding Sales, The Mom Test, distilled for this case
    craft-positioning.md                   Obviously Awesome applied to Belin
    craft-demo-and-close.md                discovery, demo, pilot close, objection handling
  assets/                                  OPERATIONAL, produced only from knowledge/
    icp.md                                 the written ICP, tiered, with disqualifiers
    90-day-plan.md                         the master calendar: content, outreach, events, gates
    posting-calendar.md                    8 weeks of LinkedIn posts, drafted
    outreach-playbook.md                   sequences per channel per country, law-checked
    call-script-si.md / call-script-de.md  cold and warm call frameworks
    demo-script.md                         the 25 minute demo, mapped to Belin screens
    pilot-offer.md                         the pilot terms one-pager (3 EUR per kWp founder pricing)
    scorecard.md                           the weekly numbers that matter, with targets
    pipeline.md                            the living prospect list and its states
.claude/skills/
  gtm-linkedin-post/SKILL.md               drafts and reviews posts against the researched rules
  gtm-outreach/SKILL.md                    produces law-checked sequences and next touches
  gtm-demo-call/SKILL.md                   prep sheet and debrief for every scheduled demo
  gtm-pilot-close/SKILL.md                 moves a warm prospect to a signed pilot
  gtm-weekly-review/SKILL.md               the Monday ritual: scorecard, pipeline, next week
```

Language rule: knowledge files in English (internal, like the rest of docs/). Assets that touch a prospect in Slovenian, German after the Slovenian versions are validated, same as the product.

## Rules of the knowledge base (non-negotiable)

1. **Every factual claim carries a source link and an access date.** No source, no claim.
2. **Legal claims come only from primary sources** (gesetze-im-internet.de, RIS for Austria, PISRS for Slovenia) or the national regulator's own guidance. Blog posts about law are leads, never sources.
3. **Numbers need two independent sources** or an explicit LOW CONFIDENCE tag.
4. **Every file header carries: last verified date, confidence (high, medium, low), refresh trigger.** Anything untouched for 90 days is stale and INDEX.md says so.
5. **The founder is primary source number one.** His ground truth about this market outranks any essay; where research contradicts him, the file records both and the tension is surfaced, not resolved silently.
6. **The mentor cites its own base.** Future GTM advice in any session must reference the file it stands on, and must say so plainly when the base has no answer yet.

## The phases

Effort calibrated against this repo's delivered history, not developer intuition: each phase is one focused session, the whole buildout is 3 to 4 sessions.

### Phase 0: scaffold and intake (part of the first session)
- [ ] Create the tree, INDEX.md with the legend, CLAUDE.md section, empty file stubs with headers.
- [ ] Write founder-groundtruth.md as an INTERVIEW: the questions below go to the founder, his answers become the file. A mentor who does not intake the mentee is a book, not a mentor.

### Phase 1: market and buyer (session 1)
- [ ] market-icp-si.md: how many solar EPCs and installers exist in Slovenia, segmented by size; name the top 30; where they cluster; who is reachable through the founder's existing network. Sources: AJPES and bizi.si registries, Borzen and Agencija za energijo statistics, GZS section lists, the founder.
- [ ] market-icp-dach.md: same shape for DE and AT at lower resolution; the German pilot contact's segment gets priority.
- [ ] buyer-psychology-construction.md: how construction SME owners buy software: referral-heavy, fair-heavy, distrust of subscriptions. Sources: vertical SaaS essays, Procore and ServiceTitan early-history interviews, PlanRadar and Craftnote founder interviews if findable.
- [ ] competitor-gtm-history.md: what the incumbents did in year one, and what their outreach looks like today, for lessons in both directions.

### Phase 2: channels and THE LEGAL GATE (session 2)
- [ ] channels-law-dach-si.md FIRST, and it gates everything after it. To verify against primary text, stated here as hypotheses and not as facts: DE cold B2B email requires prior express consent (UWG paragraph 7), DE cold calls to businesses need presumed consent, AT is stricter on both (TKG), SI permits more but ZEKom and ZVOP constraints apply, GDPR legitimate-interest outreach has real limits. Output includes a one-page DO and DO NOT table per country per channel.
- [ ] channels-linkedin.md: current algorithm behavior (van der Blom report as the standard reference, verified against a second source), document format vs image vs video reach, dwell time mechanics, Sales Navigator: what it costs, what lists it can actually build for this ICP, whether it is worth ~100 EUR per month BEFORE the pipeline justifies it.
- [ ] channels-cold-calling.md, channels-events.md (Intersolar and The smarter E Munich, Solar Solutions Düsseldorf, MOS Celje, SI energy days: dates, costs, walk-the-floor vs exhibit math), channels-media-associations.md (pv magazine DE, Montel Energetika SI, GZS, BSW-Solar: what they publish from founders).

### Phase 3: craft (session 2 or 3)
- [ ] craft-founder-led-sales.md: Founding Sales (Kazanjy) and The Mom Test (Fitzpatrick), distilled to what a solo founder with limited weekly hours can actually run.
- [ ] craft-positioning.md: Obviously Awesome (Dunford) worked through FOR BELIN: competitive alternatives are WhatsApp plus Excel, not PlanRadar; unique attributes are the money loop and the signed evidence; the market category decision (Bautagebuch app vs collaboration platform vs the money-loop tool) gets made here, on paper.
- [ ] craft-demo-and-close.md: discovery questions in the buyer's own words, the 25 minute demo arc mapped to real Belin screens, pilot terms design, the ten objections and their honest answers, including "what if you disappear", which a solo founder WILL be asked.

### Phase 4: synthesis into assets (session 3)
- [ ] Every file in assets/ produced from the knowledge files, each carrying pointers back to what it stands on. The 90-day plan sequences everything, including the standing blockers this repo already knows about: Impressum and privacy pages BEFORE German outreach, Resend deliverability BEFORE any email is load-bearing, the LinkedIn carousel brochure as the first content asset.
- [ ] The posting calendar drafts real posts, in Slovenian, in the founder's voice, from his ground-truth stories: eight weeks, two posts per week, each with its asset named.
- [ ] scorecard.md defines the weekly numbers: touches, conversations, demos booked, demos held, pilots signed, with honest targets for a solo founder, which means single digits, deliberately.

### Phase 5: distillation into skills (session 3 or 4)
- [ ] The five SKILL.md files, written with superpowers:writing-skills, each one operational: trigger description, checklist, templates inlined, the law table inlined where relevant. The test of each skill: a cold session with no other context produces correct output from the skill alone.
- [ ] CLAUDE.md gains the GTM section: the pointer to INDEX.md, the routing rule (GTM questions run through the skills), and the research-first mandate stated as law.
- [ ] Auto-memory updated: the mentor architecture exists, where it lives, the citation rule.

### Phase 6: the operating cadence (standing, after buildout)
- [ ] gtm-weekly-review runs Mondays: scorecard, pipeline moves, next week's touches, one knowledge gap to fill.
- [ ] Reality feeds back: every demo debrief and every objection heard on a real call gets appended to the relevant knowledge file. The base learns from the market, not only from research.

## What I need from the founder (the intake, phase 0)

1. Your real stories: the two hour WhatsApp search, the worst Regiestunden dispute, the acceptance that went wrong. These become the posts and the call openers; invented ones would be recognized instantly.
2. Your network map: which EPCs and subs you know personally, who owes you a favor, who the German pilot contact actually is and their current state.
3. Hours per week you can genuinely spend selling, and which hours.
4. Budget ceiling per month for tools (Sales Navigator ~100 EUR) and for one event visit.
5. Whether you will make German-language calls yourself or the DE motion must be writing-first.
6. Green light on this plan, the phase order, and the four review lenses below.

## Review lenses (every phase output passes all four)

1. **Grounded:** every claim sourced and dated, or marked unresearched. No confident guessing, per the standing mandate.
2. **Legal:** no asset may advise an outreach act the law table forbids in that country.
3. **Operator:** every asset ends in actions with owners and dates. Knowledge that does not schedule something is not done.
4. **Founder-fit:** everything sized for one person, non-developer, limited hours, Slovenian first. No fantasy teams, no US-scale volume plays.

## Definition of done

The buildout is done when a fresh session, given only this repo, can: draft a law-safe outreach sequence for a named Austrian EPC, produce next week's two LinkedIn posts in the founder's voice, prep him for tomorrow's demo call, and cite the file behind every one of those moves. Until all four work, the mentor is not built.
