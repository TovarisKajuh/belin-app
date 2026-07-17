# Phase 0 Implementation Plan: Foundations and External Clocks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** By the end of tonight (Friday 17.07), a deployed walking skeleton is live at a real URL: Next.js app with the AVE-DC design system, trilingual i18n, PWA manifest, the complete v1 database schema applied to Supabase Frankfurt, an actor access layer, and one tokenized project page rendering seeded data from the real database.

**Architecture:** Next.js App Router (server components and server actions) in this repo root. All database access happens server-side through an actor layer: a request presents a project token, the server resolves it into an actor (role, project, organization), and every data function authorizes against that actor. The browser never holds database credentials. Supabase is used for Postgres, Storage (private buckets, signed URLs) and later Realtime. The complete schema for all five v1 modules is designed and applied tonight, before any module code, per DECISIONS.md 2026-07-17.

**Tech Stack:** Next.js ^15.1 + React 19 + TypeScript ^5.8 + Tailwind ^4.1 (exactly the AVE-DC dashboard combination, so its design system transfers verbatim), next-intl ^4 for i18n (sl, de, en), @supabase/supabase-js ^2 with the Supabase CLI for migrations, vitest ^3 for unit tests, sharp (dev only) for PWA icon generation, Vercel for hosting, Resend later (domain already verified).

---

## Founder summary (read this part, the rest is engineering detail)

What exists when tonight is done:

1. A live URL (projekt.getbelin.com, with belin-app.vercel.app as automatic fallback) showing a branded Belin page in Slovenian, German and English.
2. A demo-style tokenized link that opens a real project page with real data from the real Frankfurt database: proof that every layer works end to end.
3. The complete database design for all five modules, applied and version-controlled. This is the foundation everything else builds on, which is why it gets tonight's care.
4. The app installable to a phone home screen (basic form; polished install flow is Sunday's task).

What I need from you tonight, all guided step by step in chat, about 20 minutes total:

1. Create the new Supabase project (Frankfurt) in your existing account and paste three values into a local file I prepare.
2. Create one Resend API key.
3. Add one DNS record for projekt.getbelin.com at your domain registrar (starts the propagation clock immediately).
4. Import the repository into Vercel at the end and paste in the same values.

Decisions locked in this plan (each gets a DECISIONS.md line when executed):

- Subdomain: projekt.getbelin.com. The word works in Slovenian and German and is obvious in English. Say the word if you want a different name before Task 2.
- i18n library: next-intl, the standard for this Next.js setup, server-rendering friendly, ICU plural rules for all three languages.
- Live updates approach (validated by Saturday's spike): Supabase Broadcast channels. After the server saves an entry it broadcasts on a private-by-obscurity project channel; the dashboard subscribes. Fallback if the spike disappoints: 5-second polling, which is demo-safe.
- This week migrations are pushed directly to the Frankfurt project (no local database stack, no Docker dependency). Single developer, no customer data yet. Revisited before real customer data arrives.
- Unit tests with vitest for all pure logic (progress computation, i18n completeness, token format). Real-device checks remain part of every crew-facing feature per the working discipline.

## The schema in plain words (the reviewed document the build order requires)

Module 0, core:
- organizations: every company, EPC or sub, with name and country.
- people: every person inside an organization with a role (EPC: admin, bauleiter; sub: owner, crew). Has an empty slot for a login account so real auth in M1 links to existing records instead of migrating them.
- projects: belongs to an EPC org, assigned to a sub org, carries address and coordinates, site country, project language (drives PDF language), the plan PDF file reference, extracted facts (kWp, module count and type, mounting system, roof type), and the hourly-work pre-approval flag (§ 2 Abs. 10 VOB/B).
- project_tokens: the tokenized links for the demo and pilot, one per role, revocable. Stand-in for auth until M1.
- invites: invitation links (EPC invites sub company, sub owner invites crew), used from M1, designed now.

Module 3, daily log (built first because the demo needs it):
- scope_items: the work packages with target quantity, unit and weight. Progress is computed from these, never estimated.
- daily_entries: one crew report (date, note, headcount, weather snapshot) plus child tables entry_quantities (today's installed quantities per scope item) and entry_photos. Carries a client-generated id so offline sync later cannot duplicate entries.
- material_items, material_checks, material_check_items: the Stückliste and the required first-visit check with per-item present or missing status.
- requests: sub asks EPC for material, plan or instruction, with optional photo.
- activity: the EPC notification feed, one row per event across all modules.

Module 2, compliance vault:
- documents: per company or per worker, typed (A1, Freistellungsbescheinigung, Unbedenklichkeitsbescheinigung, ID, qualification, HFU status, ZKO notification, insurance, other), with validity dates. Traffic-light status is computed from dates in code.
- document_reminders: log of sent expiry reminder emails so nobody is reminded twice.

Module 4, Regiestunden:
- hour_sheets: submitted sheet with status (draft, submitted, approved, rejected, deemed approved), the § 15 VOB/B deadline timestamp computed at submission, and the countersign signature reference.
- hour_sheet_lines: person, date, hours, description.

Module 5, Nachträge and Abnahme:
- change_orders plus change_order_photos: numbered change requests, submitted before work starts, approved or rejected with timestamps.
- acceptances plus acceptance_defects: Abnahme (final or partial) with defect list, both finger signatures, and the generated report reference.
- generated_documents: index of every produced PDF (Bautagebuch, Regiebericht, Nachtrag, Abnahmeprotokoll, completion report), which later feeds the completion report's document index.

Conventions: UUID primary keys, timestamptz timestamps, numeric quantities, text columns with CHECK constraints instead of Postgres enums (cheaper to evolve), row level security enabled on every table with zero policies (deny all direct access; only the server, holding the service role key, can touch data; per-user policies arrive with auth in M1), explicit indexes on all foreign keys used in queries, updated_at maintained by trigger.

## File structure after tonight

```
belin-app/
  app/
    layout.tsx                 root passthrough layout
    manifest.ts                PWA manifest (typed route)
    globals.css                AVE-DC design system, ported
    [locale]/
      layout.tsx               html shell, fonts, i18n provider
      page.tsx                 branded walking-skeleton home
      not-found.tsx            localized invalid-link page
      p/[token]/page.tsx       tokenized project page (real data)
  i18n/
    routing.ts                 locales sl, de, en
    request.ts                 next-intl server config
  messages/
    sl.json  de.json  en.json  all UI strings, identical key sets
  lib/
    supabase/admin.ts          server-only service-role client
    actor.ts                   token to actor resolution
    actor-shared.ts            pure token format guard (unit tested)
    data/projects.ts           actor-authorized data functions
    progress.ts                weighted progress computation (pure)
    database.types.ts          generated from live schema
  tests/
    progress.test.ts
    token-format.test.ts
    messages-parity.test.ts
  supabase/
    config.toml                CLI config
    migrations/
      20260717210000_init_v1_schema.sql
      20260717220000_storage_buckets.sql
  scripts/
    generate-icons.mjs         renders PWA icons from inline SVG
    seed-demo.mjs              rerunnable minimal seed
  public/icons/                generated PNGs (committed)
  middleware.ts                locale routing
  next.config.ts  postcss.config.mjs  tsconfig.json  vitest.config.ts
  package.json  .gitignore  .env.example  README.md
```

Execution notes for every task below:

- Work on branch main, commit per task. The founder mandate requires the CHANGELOG.md entry in the same commit; each commit step includes its exact CHANGELOG text.
- Never commit .env.local. The service role key bypasses all row security; it exists only in .env.local and in Vercel server env vars.
- If the founder chose a different subdomain in review, replace projekt.getbelin.com everywhere it appears.

---

### Task 1: Repository hygiene

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Create .gitignore**

```gitignore
node_modules/
.next/
out/
build/
*.tsbuildinfo
next-env.d.ts

.env
.env.local
.env.*.local

.vercel
.supabase

*.log
.DS_Store
Thumbs.db
```

- [ ] **Step 2: Create .env.example**

```bash
# Copy to .env.local and fill in. Values come from Task 2 (guided).
# NEVER commit .env.local. The service role key bypasses all row security.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 3: Create README.md**

```markdown
# Belin

Collaboration app between solar EPCs and their installation subcontractors (Germany, Austria, Slovenia). EPC pays, subs ride free.

Read CLAUDE.md and HANDOFF.md first. Decisions live in DECISIONS.md, changes in CHANGELOG.md, session logs in docs/sessions/.

## Stack

Next.js App Router, Supabase (EU, Frankfurt: Postgres, Storage, Realtime), Vercel, Resend. PWA. Trilingual UI (sl, de, en) via next-intl.

## Commands

- `npm run dev` : dev server on http://localhost:3000
- `npm test` : unit tests (vitest)
- `npm run lint` : type check (tsc --noEmit)
- `npm run build` : production build
- `npm run seed` : apply the rerunnable demo seed to the linked database
- `npm run gen:types` : regenerate lib/database.types.ts from the live schema
- `npm run icons` : regenerate PWA icons from scripts/generate-icons.mjs

## Environment

Copy `.env.example` to `.env.local` and fill values from the Supabase project settings (Project URL, anon key, service role key) and Resend. `.env.local` is never committed.
```

- [ ] **Step 4: Commit**

Append to CHANGELOG.md under a new `## 2026-07-17 (night)` heading (create the heading if this is the night's first entry):

```markdown
- Added .gitignore, .env.example and README.md. Why: phase 0 starts; secrets must be untrackable before any env file exists, and the README gives future sessions the command map.
```

```bash
git add .gitignore .env.example README.md CHANGELOG.md
git commit -m "Add repository hygiene files for phase 0 start"
```

---

### Task 2: Founder provisioning session (external clocks)

No code files. This is a guided chat session; Claude gives the founder these steps one at a time and waits. Everything else tonight except Task 13 works even if this task stalls, but DNS must start now because propagation time is the one thing hard work cannot compress.

- [ ] **Step 1: Supabase project**

Founder, in the browser: supabase.com/dashboard, existing organization, New project.
- Name: `belin-app`
- Database password: generate strong, SAVE IT in your password manager (needed again in Task 7)
- Region: Europe (Frankfurt), eu-central-1
- Create, wait about 2 minutes for provisioning.

- [ ] **Step 2: Copy the three keys**

Founder: Project Settings, API section. Copy into a private note for Step 4:
- Project URL (looks like `https://<ref>.supabase.co`)
- `anon` `public` key
- `service_role` key (treat like a bank password)

Also note the project ref (the subdomain part of the URL), needed in Task 7.

- [ ] **Step 3: Supabase access token for the CLI**

Founder: account menu (top right), Account settings, Access Tokens, Generate new token, name `belin-cli`. Copy it for Step 4.

- [ ] **Step 4: Fill .env.local**

Claude runs `cp .env.example .env.local`, founder pastes the three Supabase values into `.env.local` (or dictates them in chat, accepted risk in a private session, founder's call). The access token is used once in Task 7 via `npx supabase login`.

- [ ] **Step 5: Resend API key**

Founder: resend.com dashboard (the account already sending for getbelin.com), API Keys, Create API key, name `belin-app`, permission Sending access. Paste into `RESEND_API_KEY` in `.env.local`. Confirm on the Domains page that getbelin.com shows Verified (expected: yes).

- [ ] **Step 6: DNS record at the registrar, start the clock**

Founder: at the DNS provider for getbelin.com, add:
- Type: CNAME
- Name: `projekt`
- Value: `cname.vercel-dns.com`
- TTL: default

It will not serve anything until Task 13 attaches it in Vercel; creating it now means propagation runs while we build.

- [ ] **Step 7: Verify**

Claude runs:

```bash
grep -c "SUPABASE" .env.local
```

Expected: 3. Then a visual check of the file (Claude opens it locally, never echoes values into chat): no Supabase line ends bare with `=`, all three values present.

---

### Task 3: Next.js scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx` (temporary, replaced in Task 5)

- [ ] **Step 1: Create package.json**

Versions pin to the AVE-DC dashboard's proven combination where they overlap.

```json
{
  "name": "belin-app",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": ">=20.9"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "seed": "node --env-file=.env.local scripts/seed-demo.mjs",
    "gen:types": "supabase gen types typescript --linked > lib/database.types.ts",
    "icons": "node scripts/generate-icons.mjs"
  },
  "dependencies": {
    "@fontsource-variable/inter": "^5.2.8",
    "@fontsource/jetbrains-mono": "^5.2.5",
    "@supabase/supabase-js": "^2.45.0",
    "next": "^15.1.6",
    "next-intl": "^4.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.14",
    "@types/node": "^22.14.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "sharp": "^0.34.0",
    "supabase": "^2.0.0",
    "tailwindcss": "^4.1.14",
    "typescript": "^5.8.2",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "scripts"]
}
```

- [ ] **Step 3: Create next.config.ts**

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 4: Create postcss.config.mjs**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 5: Create vitest.config.ts**

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
```

- [ ] **Step 6: Create the root passthrough layout**

`app/layout.tsx` (the html shell lives in the [locale] layout from Task 5):

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 7: Create a temporary root page**

`app/page.tsx` (replaced by the middleware redirect once Task 5 lands; exists so the app boots before i18n does):

```tsx
export default function Placeholder() {
  return <p>Belin scaffold boots. i18n arrives in Task 5.</p>;
}
```

- [ ] **Step 8: Install and boot**

```bash
npm install
npm run dev
```

Expected: dev server starts, http://localhost:3000 renders the placeholder line without errors. Stop the server. If `sharp` or `supabase` postinstall warns on Windows, note it but continue; both are dev tools verified in their own tasks.

- [ ] **Step 9: Commit**

Append to CHANGELOG.md:

```markdown
- Scaffolded Next.js 15 + React 19 + Tailwind 4 + TypeScript, pinned to the AVE-DC dashboard's proven versions, with vitest and the Supabase CLI as dev tools. Why: phase 0 scaffold; matching AVE-DC versions lets its design system transfer without translation.
```

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs vitest.config.ts app/layout.tsx app/page.tsx CHANGELOG.md
git commit -m "Scaffold Next.js app matching AVE-DC stack versions"
```

---

### Task 4: Port the AVE-DC design system

**Files:**
- Create: `app/globals.css` (copied from AVE-DC, header adjusted)

- [ ] **Step 1: Copy the locked design system**

```bash
cp "/c/DevEnv/AVE-DC/dashboard/app/globals.css" app/globals.css
```

- [ ] **Step 2: Adjust only the header comment**

In `app/globals.css`, replace the header block comment (lines 3 to 7 of the copy) with:

```css
/* ==============================================================
   BELIN Design System, built on the AVE-DC locked token set.
   Tokens ported verbatim from AVE-DC dashboard/app/globals.css
   (itself ported from tolmin-dashboard.html). Do not redesign
   existing tokens. New Belin utilities are appended below the
   ported block and marked BELIN.
   ============================================================== */
```

Change nothing else in the file tonight. Crew-facing mobile utilities get appended (marked `/* BELIN */`) when phase 1 builds those screens.

- [ ] **Step 3: Verify the file landed intact**

```bash
grep -c "card\|hero\|--accent" app/globals.css
```

Expected: a large count (the ported system is roughly 790 lines). Visual verification happens in Task 5 Step 8 when a page actually uses it.

- [ ] **Step 4: Commit**

Append to CHANGELOG.md:

```markdown
- Ported the AVE-DC design system (globals.css) verbatim as the Belin visual foundation, per DECISIONS.md 2026-07-17. Why: proven token set; Belin-specific utilities will be appended, existing tokens stay locked.
```

```bash
git add app/globals.css CHANGELOG.md
git commit -m "Port AVE-DC design tokens as the Belin design system"
```

---

### Task 5: Trilingual i18n plumbing (next-intl)

**Files:**
- Create: `i18n/routing.ts`
- Create: `i18n/request.ts`
- Create: `middleware.ts`
- Create: `messages/sl.json`, `messages/de.json`, `messages/en.json`
- Create: `app/[locale]/layout.tsx`
- Create: `app/[locale]/page.tsx`
- Create: `tests/messages-parity.test.ts`
- Delete: `app/page.tsx` (the Task 3 placeholder)

- [ ] **Step 1: Write the failing parity test first**

The most common i18n bug is a key existing in one language and missing in another. This test makes that impossible to merge. `tests/messages-parity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const locales = ["sl", "de", "en"] as const;

function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

function loadKeys(locale: string): string[] {
  const file = path.resolve(__dirname, `../messages/${locale}.json`);
  return flattenKeys(JSON.parse(readFileSync(file, "utf8"))).sort();
}

describe("message catalogs", () => {
  it("have identical key sets in sl, de and en", () => {
    const [sl, de, en] = locales.map(loadKeys);
    expect(de).toEqual(sl);
    expect(en).toEqual(sl);
  });

  it("have no empty strings", () => {
    for (const locale of locales) {
      const file = path.resolve(__dirname, `../messages/${locale}.json`);
      const raw = JSON.parse(readFileSync(file, "utf8"));
      const empties = flattenKeys(raw).filter((k) => {
        const value = k.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], raw);
        return value === "";
      });
      expect(empties, `${locale} has empty strings`).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

```bash
npm test
```

Expected: FAIL, cannot find `messages/sl.json`.

- [ ] **Step 3: Create the three message catalogs**

`messages/sl.json`:

```json
{
  "common": {
    "appName": "Belin",
    "tagline": "Sodelovanje med EPC in monterskimi ekipami"
  },
  "home": {
    "eyebrow": "Ogrodje deluje",
    "subtitle": "Temelj je postavljen: oblikovni sistem, trije jeziki, baza v Frankfurtu, PWA.",
    "languageLabel": "Jezik"
  },
  "project": {
    "roleEpc": "Pogled EPC",
    "roleSub": "Pogled ekipe",
    "scope": "Obseg del",
    "progress": "Napredek",
    "address": "Naslov",
    "installedOfTarget": "{installed} od {target} {unit}",
    "notFoundTitle": "Povezava ni veljavna",
    "notFoundBody": "Ta povezava do projekta ne obstaja ali je bila preklicana."
  }
}
```

`messages/de.json`:

```json
{
  "common": {
    "appName": "Belin",
    "tagline": "Zusammenarbeit zwischen EPC und Montageteams"
  },
  "home": {
    "eyebrow": "Skelett steht",
    "subtitle": "Das Fundament steht: Designsystem, drei Sprachen, Datenbank in Frankfurt, PWA.",
    "languageLabel": "Sprache"
  },
  "project": {
    "roleEpc": "EPC-Ansicht",
    "roleSub": "Team-Ansicht",
    "scope": "Leistungsumfang",
    "progress": "Fortschritt",
    "address": "Adresse",
    "installedOfTarget": "{installed} von {target} {unit}",
    "notFoundTitle": "Link ungültig",
    "notFoundBody": "Dieser Projektlink existiert nicht oder wurde widerrufen."
  }
}
```

`messages/en.json`:

```json
{
  "common": {
    "appName": "Belin",
    "tagline": "Collaboration between EPCs and installation crews"
  },
  "home": {
    "eyebrow": "Skeleton is live",
    "subtitle": "The foundation stands: design system, three languages, database in Frankfurt, PWA.",
    "languageLabel": "Language"
  },
  "project": {
    "roleEpc": "EPC view",
    "roleSub": "Crew view",
    "scope": "Scope of work",
    "progress": "Progress",
    "address": "Address",
    "installedOfTarget": "{installed} of {target} {unit}",
    "notFoundTitle": "Link not valid",
    "notFoundBody": "This project link does not exist or has been revoked."
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

```bash
npm test
```

Expected: PASS, 2 tests green.

- [ ] **Step 5: Create routing, request config and middleware**

`i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["sl", "de", "en"],
  defaultLocale: "sl",
});
```

`i18n/request.ts`:

```ts
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

`middleware.ts` (repo root):

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 6: Create the locale layout and the walking-skeleton home page**

Delete `app/page.tsx` (the middleware now redirects / to /sl).

`app/[locale]/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono";
import "../globals.css";

export const metadata: Metadata = {
  title: "Belin",
  description: "Collaboration between solar EPCs and their installation subcontractors.",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f6f8",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`app/[locale]/page.tsx` (uses the ported hero classes so the design port is visually verified):

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { routing } from "@/i18n/routing";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">{t("home.eyebrow")}</div>
          <h1>{t("common.appName")}</h1>
          <p className="hero-sub">{t("common.tagline")}. {t("home.subtitle")}</p>
          <div className="hero-meta">
            <div className="hero-meta-item">
              <div className="label">{t("home.languageLabel")}</div>
              <div className="value" style={{ display: "flex", gap: 14 }}>
                {routing.locales.map((l) => (
                  <Link
                    key={l}
                    href={`/${l}`}
                    style={{
                      color: l === locale ? "white" : "rgba(255,255,255,0.55)",
                      textDecoration: "none",
                      textTransform: "uppercase",
                    }}
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 7: Type check**

```bash
npm run lint
```

Expected: clean exit. (`next-env.d.ts` appears after the first `npm run dev` or `npm run build`; if `lint` complains it is missing, run `npm run dev` once first.)

- [ ] **Step 8: Boot and verify all three locales**

```bash
npm run dev
```

Check in the browser:
- http://localhost:3000 redirects to /sl and shows the Slovenian hero on the blue-to-navy gradient with Inter loaded (compare against AVE-DC: heavy heading, uppercase eyebrow with the line prefix).
- /de and /en show the German and English strings.
- Switch links work. Also check once in a phone-sized viewport (devtools, iPhone SE): hero readable, no horizontal scroll.

Stop the server.

- [ ] **Step 9: Commit**

Append to CHANGELOG.md:

```markdown
- Added next-intl with sl, de and en catalogs, locale routing, and a parity test that fails the build if any key is missing or empty in any language. Why: trilingual from the first commit is a founding decision; the parity test enforces it mechanically.
- Replaced the scaffold placeholder with the walking-skeleton home page on the ported design system. Why: visual proof the token port renders correctly in all three languages.
```

```bash
git rm app/page.tsx
git add i18n middleware.ts messages tests app CHANGELOG.md
git commit -m "Add trilingual i18n with parity test and skeleton home page"
```

(`git add app`, not `app/[locale]`: square brackets are glob characters to both the shell and git pathspecs and would not match the literal directory name.)

---

### Task 6: PWA manifest and icons

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create: `public/icons/` (generated PNGs, committed)
- Create: `app/manifest.ts`

- [ ] **Step 1: Create the icon generator**

Placeholder mark until the real logo lands: white B on navy, the design system's ink color. `scripts/generate-icons.mjs`:

```js
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const NAVY = "#0a1628";

function svg({ size, radius, glyphScale }) {
  const fontSize = Math.round(size * glyphScale);
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" fill="${NAVY}"/>
      <text x="50%" y="50%" dy=".36em" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="800"
        font-size="${fontSize}" fill="#ffffff">B</text>
    </svg>`
  );
}

mkdirSync("public/icons", { recursive: true });

const jobs = [
  { file: "icon-192.png", size: 192, radius: 36, glyphScale: 0.58 },
  { file: "icon-512.png", size: 512, radius: 96, glyphScale: 0.58 },
  // Maskable: full-bleed background, smaller glyph inside the safe zone.
  { file: "icon-maskable-512.png", size: 512, radius: 0, glyphScale: 0.42 },
  { file: "apple-touch-icon.png", size: 180, radius: 0, glyphScale: 0.58 },
];

for (const job of jobs) {
  await sharp(svg(job)).png().toFile(`public/icons/${job.file}`);
  console.log(`wrote public/icons/${job.file}`);
}
```

- [ ] **Step 2: Generate and eyeball**

```bash
npm run icons
```

Expected: four PNGs in public/icons/. Open icon-512.png and check: navy rounded square, centered white bold B, no clipping.

- [ ] **Step 3: Create the manifest route**

`app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Belin",
    short_name: "Belin",
    description: "Collaboration between solar EPCs and their installation subcontractors.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#f5f6f8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

Note: start_url "/" lands on the locale redirect. A per-token start_url (so the installed app opens straight on the crew's project) is a phase 2 task in the approved demo design; this manifest is deliberately the simple base.

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Open http://localhost:3000/manifest.webmanifest: JSON renders. In Chrome devtools, Application, Manifest: no errors, icons load. Stop the server.

- [ ] **Step 5: Commit**

Append to CHANGELOG.md:

```markdown
- Added the PWA manifest and generated placeholder icons (navy B). Why: PWA from day one is a founding decision; install polish and a per-token start URL are phase 2 tasks per the demo design.
```

```bash
git add scripts/generate-icons.mjs public/icons app/manifest.ts CHANGELOG.md
git commit -m "Add PWA manifest and generated placeholder icons"
```

---

### Task 7: The complete v1 schema

**Files:**
- Create: `supabase/config.toml` (via CLI init)
- Create: `supabase/migrations/20260717210000_init_v1_schema.sql`
- Create: `lib/database.types.ts` (generated)

- [ ] **Step 1: Init and link the Supabase CLI**

Uses the access token and project ref from Task 2, and the database password from the founder's password manager.

```bash
npx supabase login --token <ACCESS_TOKEN_FROM_TASK_2>
npx supabase init
npx supabase link --project-ref <PROJECT_REF_FROM_TASK_2> -p "<DB_PASSWORD>"
```

Expected: "Finished supabase link". If `supabase init` asks about VS Code settings, answer no.

- [ ] **Step 2: Write the full schema migration**

`supabase/migrations/20260717210000_init_v1_schema.sql`, exactly:

```sql
-- BELIN v1 schema. Complete data model for all five modules, designed
-- before any module code (DECISIONS.md 2026-07-17 evening).
-- Conventions: uuid pks, timestamptz, numeric quantities, text + CHECK
-- instead of enums, RLS enabled with zero policies (server-only access
-- via service role until M1 adds per-user policies), explicit fk indexes.

create extension if not exists moddatetime with schema extensions;

-- ============================================================
-- Module 0: core (organizations, people, projects, tokens, invites)
-- ============================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('epc', 'sub')),
  name text not null,
  country text check (country in ('de', 'at', 'si')),
  address text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete restrict,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  role text not null check (role in ('admin', 'bauleiter', 'owner', 'crew')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_people_org on public.people (org_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  epc_org_id uuid not null references public.organizations (id) on delete restrict,
  sub_org_id uuid references public.organizations (id) on delete restrict,
  name text not null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'completed', 'cancelled')),
  language text not null default 'de' check (language in ('sl', 'de', 'en')),
  country text not null check (country in ('de', 'at', 'si')),
  address_street text,
  address_zip text,
  address_city text,
  lat double precision,
  lng double precision,
  plan_pdf_path text,
  kwp numeric(8, 2),
  module_count integer,
  module_type text,
  mounting_system text,
  roof_type text,
  hourly_work_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_projects_epc_org on public.projects (epc_org_id);
create index idx_projects_sub_org on public.projects (sub_org_id);

create table public.project_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  role text not null check (role in ('epc', 'sub')),
  token text not null unique,
  label text,
  revoked boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_project_tokens_project on public.project_tokens (project_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sub_company', 'crew', 'epc_member')),
  project_id uuid references public.projects (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete cascade,
  email text,
  invited_role text check (invited_role in ('admin', 'bauleiter', 'owner', 'crew')),
  token text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_by_person uuid references public.people (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_invites_project on public.invites (project_id);
create index idx_invites_org on public.invites (org_id);

-- ============================================================
-- Module 3: daily log, quantities, materials, requests, activity
-- ============================================================

create table public.scope_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  unit text not null,
  target_qty numeric(12, 2) not null check (target_qty >= 0),
  weight numeric(8, 2) not null default 1 check (weight >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_scope_items_project on public.scope_items (project_id);

create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  entry_date date not null,
  note text,
  headcount integer check (headcount >= 0),
  weather jsonb,
  created_by_person uuid references public.people (id) on delete set null,
  client_generated_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_daily_entries_project_date
  on public.daily_entries (project_id, entry_date desc);

create table public.entry_quantities (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.daily_entries (id) on delete cascade,
  scope_item_id uuid not null references public.scope_items (id) on delete cascade,
  qty numeric(12, 2) not null check (qty >= 0),
  unique (entry_id, scope_item_id)
);
create index idx_entry_quantities_entry on public.entry_quantities (entry_id);
create index idx_entry_quantities_scope_item on public.entry_quantities (scope_item_id);

create table public.entry_photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.daily_entries (id) on delete cascade,
  storage_path text not null,
  width integer,
  height integer,
  taken_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_entry_photos_entry on public.entry_photos (entry_id);

create table public.material_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  qty numeric(12, 2) not null check (qty >= 0),
  unit text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_material_items_project on public.material_items (project_id);

create table public.material_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  is_complete boolean not null,
  note text,
  checked_by_person uuid references public.people (id) on delete set null,
  checked_at timestamptz not null default now()
);
create index idx_material_checks_project on public.material_checks (project_id);

create table public.material_check_items (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.material_checks (id) on delete cascade,
  material_item_id uuid not null references public.material_items (id) on delete cascade,
  status text not null check (status in ('present', 'partial', 'missing')),
  missing_qty numeric(12, 2) check (missing_qty >= 0),
  unique (check_id, material_item_id)
);
create index idx_material_check_items_check on public.material_check_items (check_id);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null check (type in ('material', 'plan', 'instruction')),
  text text not null,
  photo_path text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  response_note text,
  resolved_at timestamptz,
  created_by_person uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_requests_project_status on public.requests (project_id, status);

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in (
    'entry_submitted',
    'material_check_completed',
    'request_created',
    'request_resolved',
    'document_uploaded',
    'document_expiring',
    'hours_submitted',
    'hours_decided',
    'hours_deemed_approved',
    'change_order_submitted',
    'change_order_decided',
    'acceptance_signed',
    'project_updated'
  )),
  payload jsonb not null default '{}'::jsonb,
  actor_person uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_activity_project_created
  on public.activity (project_id, created_at desc);

-- ============================================================
-- Module 2: compliance vault
-- ============================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete restrict,
  person_id uuid references public.people (id) on delete restrict,
  type text not null check (type in (
    'a1',
    'freistellungsbescheinigung',
    'unbedenklichkeitsbescheinigung',
    'id_document',
    'qualification',
    'hfu_status',
    'zko_notification',
    'insurance',
    'other'
  )),
  title text not null,
  storage_path text not null,
  valid_from date,
  valid_until date,
  uploaded_by_person uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_documents_org on public.documents (org_id);
create index idx_documents_person on public.documents (person_id);
create index idx_documents_valid_until on public.documents (valid_until);

create table public.document_reminders (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  days_before integer not null,
  sent_at timestamptz not null default now()
);
create index idx_document_reminders_document
  on public.document_reminders (document_id);

-- ============================================================
-- Module 4: Regiestunden
-- ============================================================

create table public.hour_sheets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sub_org_id uuid not null references public.organizations (id) on delete restrict,
  number integer not null,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'approved', 'rejected', 'deemed_approved'
  )),
  submitted_at timestamptz,
  -- Six working days (Werktage, Mon to Sat excluding public holidays)
  -- from submission, computed in code at submit time. § 15 VOB/B.
  deadline_at timestamptz,
  decided_at timestamptz,
  decided_by_person uuid references public.people (id) on delete set null,
  epc_signature_path text,
  note text,
  created_by_person uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);
create index idx_hour_sheets_project_status
  on public.hour_sheets (project_id, status);

create table public.hour_sheet_lines (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.hour_sheets (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  work_date date not null,
  hours numeric(6, 2) not null check (hours > 0),
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_hour_sheet_lines_sheet on public.hour_sheet_lines (sheet_id);

-- ============================================================
-- Module 5: Nachtraege and Abnahme
-- ============================================================

create table public.change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  number integer not null,
  title text not null,
  description text,
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected')),
  decided_at timestamptz,
  decided_by_person uuid references public.people (id) on delete set null,
  created_by_person uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);
create index idx_change_orders_project on public.change_orders (project_id);

create table public.change_order_photos (
  id uuid primary key default gen_random_uuid(),
  change_order_id uuid not null references public.change_orders (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_change_order_photos_order
  on public.change_order_photos (change_order_id);

create table public.acceptances (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null default 'final' check (kind in ('final', 'partial')),
  status text not null default 'draft' check (status in ('draft', 'signed')),
  conducted_at timestamptz,
  epc_signer_name text,
  sub_signer_name text,
  epc_signature_path text,
  sub_signature_path text,
  report_pdf_path text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_acceptances_project on public.acceptances (project_id);

create table public.acceptance_defects (
  id uuid primary key default gen_random_uuid(),
  acceptance_id uuid not null references public.acceptances (id) on delete cascade,
  description text not null,
  photo_path text,
  due_date date,
  status text not null default 'open' check (status in ('open', 'resolved')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_acceptance_defects_acceptance
  on public.acceptance_defects (acceptance_id);

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in (
    'bautagebuch', 'regiebericht', 'nachtrag', 'abnahmeprotokoll', 'completion_report'
  )),
  language text not null check (language in ('sl', 'de', 'en')),
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index idx_generated_documents_project
  on public.generated_documents (project_id);

-- ============================================================
-- updated_at triggers
-- ============================================================

create trigger set_updated_at before update on public.organizations
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.people
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.projects
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.scope_items
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.daily_entries
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.material_items
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.requests
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.documents
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.hour_sheets
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.hour_sheet_lines
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.change_orders
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.acceptances
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.acceptance_defects
  for each row execute function extensions.moddatetime (updated_at);

-- ============================================================
-- Row level security: enabled everywhere, zero policies.
-- Only the server (service role) can read or write until M1
-- introduces authenticated per-user policies.
-- ============================================================

alter table public.organizations enable row level security;
alter table public.people enable row level security;
alter table public.projects enable row level security;
alter table public.project_tokens enable row level security;
alter table public.invites enable row level security;
alter table public.scope_items enable row level security;
alter table public.daily_entries enable row level security;
alter table public.entry_quantities enable row level security;
alter table public.entry_photos enable row level security;
alter table public.material_items enable row level security;
alter table public.material_checks enable row level security;
alter table public.material_check_items enable row level security;
alter table public.requests enable row level security;
alter table public.activity enable row level security;
alter table public.documents enable row level security;
alter table public.document_reminders enable row level security;
alter table public.hour_sheets enable row level security;
alter table public.hour_sheet_lines enable row level security;
alter table public.change_orders enable row level security;
alter table public.change_order_photos enable row level security;
alter table public.acceptances enable row level security;
alter table public.acceptance_defects enable row level security;
alter table public.generated_documents enable row level security;
```

- [ ] **Step 3: Push the migration**

```bash
npx supabase db push
```

Expected: "Applying migration 20260717210000_init_v1_schema.sql... Finished supabase db push." If it errors, read the SQL error line, fix the migration file, and push again (the remote tracks applied migrations; a failed migration applies nothing).

- [ ] **Step 4: Generate types and verify they compile**

```bash
npm run gen:types
npm run lint
```

Expected: `lib/database.types.ts` exists, contains `organizations`, `daily_entries`, `hour_sheets` and friends, and the type check is clean. Open the file and spot-check that `projects` has `hourly_work_approved: boolean`.

- [ ] **Step 5: Commit**

Append to CHANGELOG.md:

```markdown
- Designed and applied the complete v1 schema (23 tables covering all five modules) as the first migration, with RLS enabled and zero policies (server-only access until M1), updated_at triggers and explicit fk indexes. Why: schema-once before module code is a logged decision; the plan document holds the plain-language version the founder reviewed.
- Generated lib/database.types.ts from the live schema. Why: typed data layer from the first query.
```

```bash
git add supabase lib/database.types.ts CHANGELOG.md
git commit -m "Apply complete v1 schema and generate database types"
```

---

### Task 8: Storage buckets

**Files:**
- Create: `supabase/migrations/20260717220000_storage_buckets.sql`

- [ ] **Step 1: Write the buckets migration**

All buckets private. Access only via server-minted signed URLs. `supabase/migrations/20260717220000_storage_buckets.sql`:

```sql
-- Private storage buckets for all five modules. No storage.objects
-- policies: only the server (service role) reads and writes; clients
-- get short-lived signed URLs minted after actor authorization.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos', 'photos', false, 15728640,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('plans', 'plans', false, 31457280, array['application/pdf']),
  ('docs', 'docs', false, 31457280,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('signatures', 'signatures', false, 2097152, array['image/png']),
  ('reports', 'reports', false, 31457280, array['application/pdf'])
on conflict (id) do nothing;
```

- [ ] **Step 2: Push and verify**

```bash
npx supabase db push
```

Expected: migration applies. Founder or Claude checks the Supabase dashboard, Storage: five buckets listed, all marked private.

- [ ] **Step 3: Commit**

Append to CHANGELOG.md:

```markdown
- Created the five private storage buckets (photos, plans, docs, signatures, reports) with size and mime limits. Why: private-by-default file storage per the legal approach in HANDOFF.md section 8; clients only ever see signed URLs.
```

```bash
git add supabase/migrations/20260717220000_storage_buckets.sql CHANGELOG.md
git commit -m "Add private storage buckets migration"
```

---

### Task 9: Progress computation (pure logic, TDD)

**Files:**
- Create: `tests/progress.test.ts`
- Create: `lib/progress.ts`

- [ ] **Step 1: Write the failing tests**

`tests/progress.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { projectProgress, type ScopeProgressInput } from "@/lib/progress";

function item(overrides: Partial<ScopeProgressInput> = {}): ScopeProgressInput {
  return { targetQty: 100, weight: 1, installedQty: 0, ...overrides };
}

describe("projectProgress", () => {
  it("returns 0 for no scope items", () => {
    expect(projectProgress([])).toBe(0);
  });

  it("returns 0 when nothing is installed", () => {
    expect(projectProgress([item(), item()])).toBe(0);
  });

  it("computes a single item's percentage", () => {
    expect(projectProgress([item({ installedQty: 25 })])).toBe(25);
  });

  it("weights items by their weight share", () => {
    // Modules weight 4 at 50%, cabling weight 1 at 0%: (4*50 + 1*0) / 5 = 40
    expect(
      projectProgress([
        item({ weight: 4, installedQty: 50 }),
        item({ weight: 1, installedQty: 0 }),
      ])
    ).toBe(40);
  });

  it("clamps overdelivery at 100 percent per item", () => {
    expect(projectProgress([item({ installedQty: 150 })])).toBe(100);
  });

  it("ignores items with zero target and zero weight contribution", () => {
    // A zero-target item cannot express progress; it must not poison the sum.
    expect(
      projectProgress([
        item({ targetQty: 0, weight: 1, installedQty: 0 }),
        item({ installedQty: 50 }),
      ])
    ).toBe(50);
  });

  it("returns 0 when all weights are zero", () => {
    expect(projectProgress([item({ weight: 0, installedQty: 50 })])).toBe(0);
  });

  it("rounds to one decimal", () => {
    expect(projectProgress([item({ targetQty: 3, installedQty: 1 })])).toBe(33.3);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test
```

Expected: FAIL, cannot resolve `@/lib/progress`.

- [ ] **Step 3: Implement**

`lib/progress.ts`:

```ts
// Weighted, computed, never estimated: the founding progress principle.
// Percent complete = sum(weight_i * completion_i) / sum(weight_i) * 100,
// where completion_i = min(1, installed / target). Items with zero target
// are excluded (they cannot express completion). Result rounded to 0.1.

export interface ScopeProgressInput {
  targetQty: number;
  weight: number;
  installedQty: number;
}

export function projectProgress(items: ScopeProgressInput[]): number {
  const usable = items.filter((i) => i.targetQty > 0 && i.weight > 0);
  const totalWeight = usable.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = usable.reduce(
    (sum, i) => sum + i.weight * Math.min(1, i.installedQty / i.targetQty),
    0
  );
  return Math.round((weighted / totalWeight) * 1000) / 10;
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npm test
```

Expected: PASS, all progress tests green plus the parity tests from Task 5.

- [ ] **Step 5: Commit**

Append to CHANGELOG.md:

```markdown
- Added the weighted progress computation with full unit tests. Why: computed-never-estimated progress is the founder's differentiator; this is the exact formula the dashboard, PDFs and later Abschlagsrechnung documentation will share.
```

```bash
git add tests/progress.test.ts lib/progress.ts CHANGELOG.md
git commit -m "Add weighted scope progress computation with tests"
```

---

### Task 10: Actor access layer

**Files:**
- Create: `tests/token-format.test.ts`
- Create: `lib/actor-shared.ts`
- Create: `lib/supabase/admin.ts`
- Create: `lib/actor.ts`
- Create: `lib/data/projects.ts`

- [ ] **Step 1: Write the failing token format tests**

The resolver hits the database only for plausibly shaped tokens. `tests/token-format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isPlausibleToken } from "@/lib/actor-shared";

describe("isPlausibleToken", () => {
  it("accepts url-safe tokens between 8 and 64 chars", () => {
    expect(isPlausibleToken("demo-sub-r8p3n6w1")).toBe(true);
    expect(isPlausibleToken("A1_b2-C3d4E5f6G7")).toBe(true);
  });

  it("rejects too short, too long and unsafe characters", () => {
    expect(isPlausibleToken("short")).toBe(false);
    expect(isPlausibleToken("x".repeat(65))).toBe(false);
    expect(isPlausibleToken("has space")).toBe(false);
    expect(isPlausibleToken("semi;colon")).toBe(false);
    expect(isPlausibleToken("")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test
```

Expected: FAIL, cannot resolve `@/lib/actor-shared`.

- [ ] **Step 3: Implement the shared validator**

`lib/actor-shared.ts` (no server-only import, so vitest can test it without a Next server context):

```ts
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isPlausibleToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Implement the admin client and the actor resolver**

`lib/supabase/admin.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Service role client: bypasses RLS. Server-side only, never imported
// into client components ("server-only" enforces this at build time).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

`lib/actor.ts`:

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlausibleToken } from "@/lib/actor-shared";

// The actor abstraction (DECISIONS.md 2026-07-17 evening): every data
// access resolves "who is acting" into an Actor first. Until M1 the
// only source is a project token; M1 adds a session-based actor behind
// the same type, and module code never notices the difference.

export type TokenActor = {
  kind: "token";
  role: "epc" | "sub";
  projectId: string;
  orgId: string;
  tokenId: string;
};

export type Actor = TokenActor;

export async function resolveActorFromToken(token: string): Promise<TokenActor | null> {
  if (!isPlausibleToken(token)) return null;

  const db = createAdminClient();
  const { data, error } = await db
    .from("project_tokens")
    .select("id, role, project_id, revoked, projects (epc_org_id, sub_org_id)")
    .eq("token", token)
    .maybeSingle();

  if (error || !data || data.revoked || !data.projects) return null;

  const role = data.role as "epc" | "sub";
  const orgId = role === "epc" ? data.projects.epc_org_id : data.projects.sub_org_id;
  if (!orgId) return null;

  void db
    .from("project_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined);

  return { kind: "token", role, projectId: data.project_id, orgId, tokenId: data.id };
}
```

- [ ] **Step 6: Implement the first data function**

`lib/data/projects.ts`:

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/actor";
import { projectProgress } from "@/lib/progress";

export interface ScopeItemSummary {
  id: string;
  name: string;
  unit: string;
  targetQty: number;
  weight: number;
  installedQty: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  kwp: number | null;
  moduleCount: number | null;
  progressPercent: number;
  scopeItems: ScopeItemSummary[];
}

// Every data function takes the Actor and scopes queries to the
// actor's project. Authorization lives here, not in page code.
export async function getProjectSummary(actor: Actor): Promise<ProjectSummary | null> {
  const db = createAdminClient();

  const [projectRes, scopeRes, quantitiesRes] = await Promise.all([
    db
      .from("projects")
      .select("id, name, status, address_street, address_zip, address_city, kwp, module_count")
      .eq("id", actor.projectId)
      .maybeSingle(),
    db
      .from("scope_items")
      .select("id, name, unit, target_qty, weight, sort_order")
      .eq("project_id", actor.projectId)
      .order("sort_order"),
    db
      .from("entry_quantities")
      .select("scope_item_id, qty, daily_entries!inner (project_id)")
      .eq("daily_entries.project_id", actor.projectId),
  ]);

  if (projectRes.error || !projectRes.data) return null;
  if (scopeRes.error || quantitiesRes.error) return null;

  const installedByItem = new Map<string, number>();
  for (const row of quantitiesRes.data) {
    installedByItem.set(
      row.scope_item_id,
      (installedByItem.get(row.scope_item_id) ?? 0) + Number(row.qty)
    );
  }

  const scopeItems: ScopeItemSummary[] = scopeRes.data.map((s) => ({
    id: s.id,
    name: s.name,
    unit: s.unit,
    targetQty: Number(s.target_qty),
    weight: Number(s.weight),
    installedQty: installedByItem.get(s.id) ?? 0,
  }));

  return {
    id: projectRes.data.id,
    name: projectRes.data.name,
    status: projectRes.data.status,
    addressStreet: projectRes.data.address_street,
    addressZip: projectRes.data.address_zip,
    addressCity: projectRes.data.address_city,
    kwp: projectRes.data.kwp === null ? null : Number(projectRes.data.kwp),
    moduleCount: projectRes.data.module_count,
    progressPercent: projectProgress(scopeItems),
    scopeItems,
  };
}
```

- [ ] **Step 7: Type check and full test run**

```bash
npm run lint
npm test
```

Expected: both clean. If the nested `projects (epc_org_id, sub_org_id)` select type errors against the generated types, check lib/database.types.ts was generated after Task 7 Step 3 and regenerate.

- [ ] **Step 8: Commit**

Append to CHANGELOG.md:

```markdown
- Built the actor access layer: server-only service-role client, token to actor resolution with format guard and tests, and the first actor-scoped data function (project summary with computed progress). Why: the actor abstraction is the logged architectural decision that makes the token demo permanent and the M1 auth swap a one-layer change.
```

```bash
git add lib/actor-shared.ts lib/actor.ts lib/supabase/admin.ts lib/data/projects.ts tests/token-format.test.ts CHANGELOG.md
git commit -m "Add actor access layer with token resolution and project summary"
```

---

### Task 11: Minimal seed

**Files:**
- Create: `scripts/seed-demo.mjs`

- [ ] **Step 1: Write the rerunnable seed script**

Fixed UUIDs and upserts so rerunning never duplicates. This is the plumbing seed; the full Slovenian demo seed (photos, week of history) is a phase 2 task per the approved demo design. `scripts/seed-demo.mjs`:

```js
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars. Run via: npm run seed");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const EPC_ORG = "11111111-1111-4111-8111-111111111111";
const SUB_ORG = "22222222-2222-4222-8222-222222222222";
const PROJECT = "33333333-3333-4333-8333-333333333333";
const SCOPE_UK = "44444444-4444-4444-8444-444444444401";
const SCOPE_MODULES = "44444444-4444-4444-8444-444444444402";
const SCOPE_DC = "44444444-4444-4444-8444-444444444403";
const PERSON_EPC = "66666666-6666-4666-8666-666666666601";
const PERSON_SUB = "66666666-6666-4666-8666-666666666602";
const ENTRY_1 = "55555555-5555-4555-8555-555555555501";
const TOKEN_EPC = "77777777-7777-4777-8777-777777777701";
const TOKEN_SUB = "77777777-7777-4777-8777-777777777702";

async function upsert(table, rows) {
  const { error } = await db.from(table).upsert(rows, { onConflict: "id" });
  if (error) {
    console.error(`${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`${table}: ${rows.length} row(s) upserted`);
}

await upsert("organizations", [
  { id: EPC_ORG, type: "epc", name: "Sonce Energija d.o.o.", country: "si" },
  { id: SUB_ORG, type: "sub", name: "AVESOL d.o.o.", country: "si" },
]);

await upsert("people", [
  { id: PERSON_EPC, org_id: EPC_ORG, full_name: "Matej Kovač", role: "bauleiter" },
  { id: PERSON_SUB, org_id: SUB_ORG, full_name: "Luka Zupan", role: "crew" },
]);

await upsert("projects", [
  {
    id: PROJECT,
    epc_org_id: EPC_ORG,
    sub_org_id: SUB_ORG,
    name: "PSE Trgovski center Kranj",
    status: "active",
    language: "sl",
    country: "si",
    address_street: "Cesta Staneta Žagarja 69",
    address_zip: "4000",
    address_city: "Kranj",
    lat: 46.2455,
    lng: 14.3555,
    kwp: 245.7,
    module_count: 546,
    module_type: "Trina Vertex S+ 450 W",
    mounting_system: "K2 Dome 6.10",
    roof_type: "Ravna streha",
    hourly_work_approved: true,
  },
]);

await upsert("scope_items", [
  { id: SCOPE_UK, project_id: PROJECT, name: "Podkonstrukcija", unit: "kos", target_qty: 546, weight: 2, sort_order: 1 },
  { id: SCOPE_MODULES, project_id: PROJECT, name: "Moduli", unit: "kos", target_qty: 546, weight: 4, sort_order: 2 },
  { id: SCOPE_DC, project_id: PROJECT, name: "DC kabliranje", unit: "m", target_qty: 1200, weight: 1, sort_order: 3 },
]);

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

await upsert("daily_entries", [
  {
    id: ENTRY_1,
    project_id: PROJECT,
    entry_date: yesterday,
    note: "Začetek montaže podkonstrukcije, južni del strehe.",
    headcount: 4,
    created_by_person: PERSON_SUB,
  },
]);

const { error: qErr } = await db
  .from("entry_quantities")
  .upsert(
    [{ entry_id: ENTRY_1, scope_item_id: SCOPE_UK, qty: 120 }],
    { onConflict: "entry_id,scope_item_id" }
  );
if (qErr) {
  console.error(`entry_quantities: ${qErr.message}`);
  process.exit(1);
}
console.log("entry_quantities: 1 row upserted");

await upsert("project_tokens", [
  { id: TOKEN_EPC, project_id: PROJECT, role: "epc", token: "demo-epc-k7m2x9q4", label: "Founder laptop" },
  { id: TOKEN_SUB, project_id: PROJECT, role: "sub", token: "demo-sub-r8p3n6w1", label: "Founder phone" },
]);

console.log("Seed complete.");
console.log("EPC link:  /sl/p/demo-epc-k7m2x9q4");
console.log("Crew link: /sl/p/demo-sub-r8p3n6w1");
```

Note: the seed tokens are fixed so links stay stable across reseeds. They are rotated before any real project data enters this database (logged as a follow-up in the session log).

- [ ] **Step 2: Run it twice**

```bash
npm run seed
npm run seed
```

Expected: both runs succeed with identical output (upserts, no duplicate errors). Second run proves rerunnability.

- [ ] **Step 3: Verify in the database**

Founder or Claude in the Supabase dashboard, Table Editor: projects has one row, scope_items three, project_tokens two.

- [ ] **Step 4: Commit**

Append to CHANGELOG.md:

```markdown
- Added the rerunnable minimal seed (Slovenian orgs, one project, scope, one entry, two demo tokens). Why: the walking skeleton must render real database rows; the full demo seed with history and photos is a phase 2 task.
```

```bash
git add scripts/seed-demo.mjs CHANGELOG.md
git commit -m "Add rerunnable minimal demo seed"
```

---

### Task 12: The tokenized walking-skeleton page

**Files:**
- Create: `app/[locale]/not-found.tsx`
- Create: `app/[locale]/p/[token]/page.tsx`

- [ ] **Step 1: Create the localized not-found page**

Invalid or revoked tokens land here (the `project.notFound*` keys from Task 5 are consumed here). `app/[locale]/not-found.tsx`:

```tsx
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("project");
  return (
    <main className="container section">
      <div className="card card-full fade-up">
        <h1 className="section-title">{t("notFoundTitle")}</h1>
        <p className="section-label">{t("notFoundBody")}</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create the page**

Server component, real data, both roles. This page grows into the two demo views in phase 1; tonight it proves the whole stack. `app/[locale]/p/[token]/page.tsx`:

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { resolveActorFromToken } from "@/lib/actor";
import { getProjectSummary } from "@/lib/data/projects";

export default async function ProjectTokenPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("project");

  const actor = await resolveActorFromToken(token);
  if (!actor) notFound();

  const project = await getProjectSummary(actor);
  if (!project) notFound();

  const address = [project.addressStreet, `${project.addressZip ?? ""} ${project.addressCity ?? ""}`.trim()]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="container section">
      <div className="card card-full fade-up">
        <span className="tl-tag">{actor.role === "epc" ? t("roleEpc") : t("roleSub")}</span>
        <h1 className="section-title" style={{ marginTop: 12 }}>
          {project.name}
        </h1>
        <p className="section-label">
          {t("address")}: {address}
        </p>

        <div className="stat-value" style={{ marginTop: 18 }}>
          {project.progressPercent}
          <span className="unit">%</span>
        </div>
        <div className="stat-label">{t("progress")}</div>

        <table className="log-table" style={{ marginTop: 24 }}>
          <thead>
            <tr>
              <th>{t("scope")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {project.scopeItems.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td className="num mono">
                  {t("installedOfTarget", {
                    installed: item.installedQty,
                    target: item.targetQty,
                    unit: item.unit,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify with both tokens, three locales, phone viewport**

```bash
npm run dev
```

Check:
- http://localhost:3000/sl/p/demo-sub-r8p3n6w1 shows "Pogled ekipe", the project name, address, the computed percentage 6.3 (120 of 546 at weight 2, in a total weight of 7), and "120 od 546 kos".
- Same URL with /de/ and /en/ localizes every string.
- http://localhost:3000/sl/p/demo-epc-k7m2x9q4 shows "Pogled EPC".
- A wrong token, for example /sl/p/wrong-token-123, renders the localized not-found page from Step 1.
- In devtools phone viewport (iPhone SE): readable, no horizontal scroll.

Stop the server. Run the full gate:

```bash
npm run lint
npm test
npm run build
```

Expected: all three clean.

- [ ] **Step 4: Commit**

Append to CHANGELOG.md:

```markdown
- Added the tokenized project page and the localized not-found page: token resolves to an actor, actor-scoped query renders project, computed progress and scope quantities from the Frankfurt database in all three languages. Why: the walking skeleton proves every foundation layer end to end before phase 1 builds features on top.
```

```bash
git add app CHANGELOG.md
git commit -m "Add tokenized walking-skeleton project page"
```

---

### Task 13: Deploy (GitHub, Vercel, domain)

No new files (Vercel config happens in its dashboard; no vercel.json needed for a standard Next.js app).

- [ ] **Step 1: Create the GitHub repository and push**

```bash
gh auth status
```

If authenticated:

```bash
gh repo create belin-app --private --source . --push
```

If not authenticated: founder creates a private repo named `belin-app` on github.com (no README, no gitignore), then:

```bash
git remote add origin https://github.com/<FOUNDER_ACCOUNT>/belin-app.git
git push -u origin main
```

- [ ] **Step 2: Founder imports into Vercel**

Guided in chat: vercel.com, Add New, Project, Import `belin-app`. Framework preset autodetects Next.js, leave build settings untouched. Before deploying, add Environment Variables (values from .env.local):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL` = `https://projekt.getbelin.com`

Deploy.

- [ ] **Step 3: Verify the vercel.app URL**

Open the deployment URL: / redirects to /sl, home hero renders, /sl/p/demo-epc-k7m2x9q4 renders the seeded project. Check /manifest.webmanifest loads.

- [ ] **Step 4: Attach the domain**

Founder: Vercel project, Settings, Domains, add `projekt.getbelin.com`. The Task 2 CNAME should validate within minutes if propagation finished; if Vercel shows a different required value than `cname.vercel-dns.com`, update the registrar record to what Vercel displays and wait. The vercel.app URL stays the working fallback either way; do not block the night on propagation.

- [ ] **Step 5: Verify on a real phone**

Founder opens https://projekt.getbelin.com/sl/p/demo-sub-r8p3n6w1 (or the vercel.app equivalent) on their phone over mobile data: page loads fast, renders correctly. This is the first real-device checkpoint of the discipline.

- [ ] **Step 6: Commit any local changes and log**

Append to CHANGELOG.md:

```markdown
- Deployed to Vercel (live vercel.app URL, projekt.getbelin.com attached), repository pushed to GitHub (private). Why: deploy-after-every-phase discipline; deployment surprises must surface tonight, not demo morning.
```

```bash
git add CHANGELOG.md
git commit -m "Log phase 0 deployment"
git push
```

---

### Task 14: Session end ritual and phase gate

**Files:**
- Modify: `DECISIONS.md`
- Modify: `CLAUDE.md`
- Create: `docs/sessions/2026-07-17-phase-0-foundations.md`

- [ ] **Step 1: Append tonight's decisions to DECISIONS.md**

```markdown
- 2026-07-17 (night): Reuse the existing Supabase, Vercel and Resend accounts; new isolated projects inside them. Reason: fastest safe path tonight, ownership can move later; founder decision.
- 2026-07-17 (night): App domain projekt.getbelin.com with the vercel.app URL as permanent fallback; Resend domain getbelin.com was already verified, so the email clock is already done. Reason: founder decision; one CNAME, professional demo URL, zero email DNS wait.
- 2026-07-17 (night): i18n via next-intl with locale path prefixes (/sl, /de, /en) and a key-parity unit test across all three catalogs. Reason: standard, server-component friendly, and the test makes missing translations impossible to merge.
- 2026-07-17 (night): Live updates will use Supabase Broadcast channels (server broadcasts after writes, dashboard subscribes), with 5-second polling as the demo-safe fallback; Saturday morning's spike validates it on real devices. Reason: avoids exposing database change streams to anonymous clients under token access.
- 2026-07-17 (night): Migrations are pushed directly to the Frankfurt project this week (no local database stack). Reason: single developer, zero customer data, no Docker dependency on the critical path; revisit before real customer data arrives.
- 2026-07-17 (night): Schema conventions: uuid keys, timestamptz, numeric quantities, text with CHECK constraints instead of Postgres enums, RLS on with zero policies until M1, updated_at via moddatetime triggers. Reason: boring, evolvable, secure-by-default under the server-only access model.
```

- [ ] **Step 2: Update CLAUDE.md**

Add under the Stack section:

```markdown
## Commands

- `npm run dev` (localhost:3000), `npm test`, `npm run lint` (tsc), `npm run build`
- `npm run seed` (rerunnable demo seed), `npm run gen:types` (after schema changes), `npm run icons`
- Migrations: `npx supabase db push` (linked to the Frankfurt project; .env.local holds keys, never committed)
```

- [ ] **Step 3: Write the session log**

`docs/sessions/2026-07-17-phase-0-foundations.md` following the done, learned, failed, succeeded, next format of the previous log, written honestly from what actually happened during execution, including: seed tokens must rotate before real project data; the maskable icon and per-token PWA start URL are phase 2 polish; whatever actually broke tonight and how it was fixed.

- [ ] **Step 4: Final commit and push**

Append to CHANGELOG.md:

```markdown
- Session end ritual: decisions logged, CLAUDE.md commands section added, session log written. Why: working discipline mandate.
```

```bash
git add DECISIONS.md CLAUDE.md docs/sessions/2026-07-17-phase-0-foundations.md CHANGELOG.md
git commit -m "Close phase 0: decisions, commands, session log"
git push
```

- [ ] **Step 5: HARD STOP**

Phase 0 is complete. STOP. Founder reviews: the live URL on their own devices, the schema summary in this plan, DECISIONS.md. Phase 1 (the demo spine: realtime spike, Tagesbericht flow, EPC dashboard core) gets its own implementation plan Saturday morning after this review.

---

## Verification checklist for the whole phase

- [ ] `npm run lint`, `npm test`, `npm run build` all clean at HEAD
- [ ] Live URL renders /sl, /de, /en home and both token pages with seeded data
- [ ] Wrong token renders the localized not-found page, not an error page
- [ ] .env.local is not in git history: `git log --all --full-history -- .env.local` returns nothing
- [ ] Supabase dashboard: 23 tables, RLS badge on every one, five private buckets
- [ ] Phone over mobile data renders the crew token page
- [ ] CHANGELOG.md has one entry per commit tonight; DECISIONS.md has the six new lines
