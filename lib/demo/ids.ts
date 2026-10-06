// The fixed identities of the demo world.
//
// One source for the two programs that must agree on them: the seed
// (scripts/seed-demo.mjs, which runs under tsx so it can import this file) and
// the Demo Door (lib/demo/*). An id that drifted between the two would let the
// door open a session for a row the seed no longer resets, or let the seed
// purge something the door still points at.
//
// Safety does not rest on these constants alone. organizations.is_demo marks
// the same four companies in the database; the seed refuses to run when one of
// these ids belongs to an organization that is not flagged, and the door
// refuses any person whose organization is not flagged.

export const DEMO_EPC_ORG = "11111111-1111-4111-8111-111111111111";
export const DEMO_SUB_ORG = "22222222-2222-4222-8222-222222222222";
export const DEMO_SUB_ORG_2 = "22222222-2222-4222-8222-222222222223";
export const DEMO_SUB_ORG_3 = "22222222-2222-4222-8222-222222222224";
export const DEMO_ORG_IDS: readonly string[] = [DEMO_EPC_ORG, DEMO_SUB_ORG, DEMO_SUB_ORG_2, DEMO_SUB_ORG_3];

/** "Trenutno": nine site days logged, about half built. */
export const DEMO_PROJECT_TRENUTNO = "33333333-3333-4333-8333-333333333333";
/** "Dan 1": a job on its first day, nothing logged, material check still to do. */
export const DEMO_PROJECT_DAN1 = "33333333-3333-4333-8333-333333333334";
export const DEMO_LIVE_PROJECT_IDS: readonly string[] = [DEMO_PROJECT_TRENUTNO, DEMO_PROJECT_DAN1];
/** The rest of the demo EPC's book: four delivered, one not started. */
export const DEMO_BOOK_PROJECT_IDS: readonly string[] = [1, 2, 3, 4, 5].map(
  (n) => `3333333a-0000-4000-8000-00000000000${n}`,
);
export const DEMO_FIXED_PROJECT_IDS: readonly string[] = [...DEMO_LIVE_PROJECT_IDS, ...DEMO_BOOK_PROJECT_IDS];

export const DEMO_PERSON = {
  bauleiter: "66666666-6666-4666-8666-666666666601",
  crew: "66666666-6666-4666-8666-666666666602",
  subOffice: "66666666-6666-4666-8666-666666666603",
  epcAdmin: "66666666-6666-4666-8666-666666666605",
  guest: "66666666-6666-4666-8666-666666666606",
} as const;
export const DEMO_PERSON_IDS: readonly string[] = Object.values(DEMO_PERSON);

export const DEMO_TOKEN_IDS: readonly string[] = [
  "77777777-7777-4777-8777-777777777701",
  "77777777-7777-4777-8777-777777777702",
  "77777777-7777-4777-8777-777777777703",
  "77777777-7777-4777-8777-777777777704",
];

export const DEMO_PO_CURRENT = "88888888-8888-4888-8888-888888888801";
export const DEMO_PO_START = "88888888-8888-4888-8888-888888888802";
export const DEMO_SHEET_APPROVED = "99999999-9999-4999-8999-999999999901";
export const DEMO_SHEET_OPEN = "99999999-9999-4999-8999-999999999902";
export const DEMO_CO_APPROVED = "aaaaaaaa-9999-4999-8999-999999999903";
