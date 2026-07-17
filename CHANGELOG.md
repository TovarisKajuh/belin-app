# CHANGELOG

Every change to this repository is logged here, newest first, with date, what and why, in the same commit as the change. Knowingly taken shortcuts are logged here as debt the moment they are taken.

## 2026-07-17 (night)

- Scaffolded Next.js 15 + React 19 + Tailwind 4 + TypeScript, pinned to the AVE-DC dashboard's proven versions, with vitest and the Supabase CLI as dev tools, plus .claude/launch.json so sessions can boot the dev server in the preview browser. Why: phase 0 scaffold; matching AVE-DC versions lets its design system transfer without translation.
- Added .gitignore, .env.example and README.md. Why: phase 0 starts; secrets must be untrackable before any env file exists, and the README gives future sessions the command map.
- Created docs/superpowers/plans/2026-07-17-phase-0-foundations.md, the full phase 0 implementation plan including the complete v1 schema as its reviewed document. Why: phase 0 executes tonight; plan-before-code mandate, and the founder confirmed provisioning answers (reuse accounts, projekt.getbelin.com subdomain, Resend domain already verified) that the plan locks in.

## 2026-07-17 (evening)

- Created docs/specs/2026-07-17-v1-build-order.md. Why: founder delegated the build-order decision with a mandate to analyze it and log the full articulation; this spec is that articulation, plus the approved timeline and working discipline.
- Updated CLAUDE.md: trilingual UI (sl, de, en), corrected deadlines (Slovenian demo 20.07, full v1 by 26.07 evening, German EPC test from 27.07), added the Working discipline section. Why: founder decisions in the 2026-07-17 evening scope session.
- Updated HANDOFF.md sections 3, 4 and 10: corrected deadlines and languages, calendar note (17.07 is Friday), new next steps. Why: same session.
- Updated docs/specs/2026-07-17-monday-demo-design.md with an update note: Slovenian audience and seed, trilingual strings, calendar correction. Why: same session; the rest of the approved design is unchanged.
- Appended seven decisions to DECISIONS.md (timeline correction, trilingual UI, build order, schema-first, actor abstraction, working discipline, external clocks). Why: decision log mandate.
- Created CHANGELOG.md (this file) and docs/sessions/ with the first session log. Why: founder mandate to log all changes and all sessions.
