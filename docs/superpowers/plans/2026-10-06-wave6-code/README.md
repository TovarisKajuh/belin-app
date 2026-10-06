# Wave 6 reference code (planning night, 05.10.2026)

Prototype code for Wave 6 of docs/superpowers/plans/2026-10-05-demo-day-readiness.md, written and tested against commit e89f2de BEFORE Waves 1 to 5 changed the same files. It is REFERENCE, not a drop-in: the plan's Wave 6 section says, per file, whether to write it (files absent from the repo) or to merge it three-way (files that exist).

Every code file here carries a .txt suffix (theme.tsx.txt, 61m.js.txt) so that tsc, next build and vitest never pick it up: tsconfig.json includes **/*.ts and **/*.tsx. Strip the suffix only when writing a file into the app, never inside docs/. No tsconfig change is needed.
