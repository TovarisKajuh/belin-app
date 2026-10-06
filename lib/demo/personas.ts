// Who the Demo Door can make you, and where each of them lands. Pure.

import { DEMO_PERSON, DEMO_PROJECT_TRENUTNO, DEMO_PROJECT_DAN1 } from "@/lib/demo/ids";

export type DemoPersonaKey = "epcAdmin" | "bauleiter" | "subOffice" | "crew" | "guest";
export type SwitchablePersona = Exclude<DemoPersonaKey, "guest">;
export type DemoProjectKey = "trenutno" | "dan1";
export type DemoEntryTarget = DemoProjectKey | "portfelj";
export type DemoPersonCheck = "ok" | "missing" | "not-demo" | "disabled";

/** Mirrors i18n/routing.ts; tests/demo-personas.test.ts pins the two together. */
export const DEMO_LOCALES = ["sl", "de", "en"] as const;

export const DEMO_PERSONAS: Record<DemoPersonaKey, { personId: string; name: string }> = {
  epcAdmin: { personId: DEMO_PERSON.epcAdmin, name: "Marko Golob" },
  bauleiter: { personId: DEMO_PERSON.bauleiter, name: "Matej Kovač" },
  subOffice: { personId: DEMO_PERSON.subOffice, name: "Boštjan Novak" },
  crew: { personId: DEMO_PERSON.crew, name: "Luka Zupan" },
  // Crew without an email, entered only through a guest QR (D18).
  guest: { personId: DEMO_PERSON.guest, name: "Miha Oblak" },
};

export const SWITCHABLE_PERSONAS: readonly SwitchablePersona[] = ["epcAdmin", "bauleiter", "subOffice", "crew"];

export const DEMO_PROJECTS: Record<DemoProjectKey, string> = {
  trenutno: DEMO_PROJECT_TRENUTNO,
  dan1: DEMO_PROJECT_DAN1,
};

/** Crew have no portfolio: a roofer has today's site. */
export const ENTRY_TARGETS: Record<SwitchablePersona, readonly DemoEntryTarget[]> = {
  epcAdmin: ["trenutno", "dan1", "portfelj"],
  bauleiter: ["trenutno", "dan1", "portfelj"],
  subOffice: ["trenutno", "dan1", "portfelj"],
  crew: ["trenutno", "dan1"],
};

/** Message keys in the "demo" namespace. */
export const PERSONA_ROLE_KEY: Record<SwitchablePersona, string> = {
  epcAdmin: "roleEpcAdmin",
  bauleiter: "roleBauleiter",
  subOffice: "roleSubOffice",
  crew: "roleCrew",
};
export const PERSONA_NOTE_KEY: Record<SwitchablePersona, string> = {
  epcAdmin: "noteEpcAdmin",
  bauleiter: "noteBauleiter",
  subOffice: "noteSubOffice",
  crew: "noteCrew",
};

export function parseSwitchablePersona(value: unknown): SwitchablePersona | null {
  return typeof value === "string" && (SWITCHABLE_PERSONAS as readonly string[]).includes(value)
    ? (value as SwitchablePersona)
    : null;
}

export function parseEntryTarget(value: unknown, persona: SwitchablePersona): DemoEntryTarget | null {
  return typeof value === "string" && (ENTRY_TARGETS[persona] as readonly string[]).includes(value)
    ? (value as DemoEntryTarget)
    : null;
}

export function personaForPersonId(personId: string): DemoPersonaKey | null {
  for (const key of Object.keys(DEMO_PERSONAS) as DemoPersonaKey[]) {
    if (DEMO_PERSONAS[key].personId === personId) return key;
  }
  return null;
}

export function demoProjectKeyFor(projectId: string): DemoProjectKey | null {
  if (projectId === DEMO_PROJECT_TRENUTNO) return "trenutno";
  if (projectId === DEMO_PROJECT_DAN1) return "dan1";
  return null;
}

/** The runtime half of "only demo people": the row must exist, sit in a flagged company, and be enabled. */
export function checkDemoPerson(row: { isDemo: boolean; disabledAt: string | null } | null): DemoPersonCheck {
  if (!row) return "missing";
  if (!row.isDemo) return "not-demo";
  if (row.disabledAt) return "disabled";
  return "ok";
}

export function safeDemoLocale(value: unknown): (typeof DEMO_LOCALES)[number] {
  return typeof value === "string" && (DEMO_LOCALES as readonly string[]).includes(value)
    ? (value as (typeof DEMO_LOCALES)[number])
    : "sl";
}

export function landingPath(locale: string, target: DemoEntryTarget): string {
  return target === "portfelj" ? `/${locale}/app` : `/${locale}/app/${DEMO_PROJECTS[target]}`;
}

/**
 * Where a persona switch lands: the same demo project when the presenter was on
 * one (its root, because a tab one role has, like Naročilnica, another lacks),
 * Trenutno for the crew otherwise, the portfolio for everyone else. Only a path
 * on this site that names a DEMO project is ever carried across.
 */
export function switchTarget(locale: string, pathname: string, persona: SwitchablePersona): string {
  const match = /^\/(?:sl|de|en)\/app\/([0-9a-f-]{36})(?:\/|$)/.exec(pathname);
  const key = match ? demoProjectKeyFor(match[1]) : null;
  if (key) return `/${locale}/app/${DEMO_PROJECTS[key]}`;
  if (persona === "crew") return `/${locale}/app/${DEMO_PROJECTS.trenutno}`;
  return `/${locale}/app`;
}
