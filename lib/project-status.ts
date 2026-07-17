// Project lifecycle state machine. Pure and framework-free so it is unit
// tested and shared by the UI (which moves it offers) and the server action
// (which enforces it). An illegal move is impossible, not merely hidden.

export const PROJECT_STATUSES = [
  "draft",
  "active",
  "paused",
  "reviewing",
  "finished",
  "cancelled",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type PartyRole = "epc" | "sub";

export function statusTransitions(role: PartyRole, current: ProjectStatus): ProjectStatus[] {
  if (role === "epc") {
    switch (current) {
      case "draft":
        return ["active", "cancelled"];
      case "active":
        return ["paused", "finished", "cancelled"];
      case "paused":
        return ["active", "finished", "cancelled"];
      case "reviewing":
        // Accept the sub's review (finished), send it back (active), or cancel.
        return ["finished", "active", "cancelled"];
      default:
        return [];
    }
  }
  // sub: can only request a review and withdraw it.
  switch (current) {
    case "active":
      return ["reviewing"];
    case "reviewing":
      return ["active"];
    default:
      return [];
  }
}

export function canTransition(
  role: PartyRole,
  current: ProjectStatus,
  next: ProjectStatus
): boolean {
  return statusTransitions(role, current).includes(next);
}

// The verb shown on a transition button depends on who is acting and where
// from, not just the target (sub active->reviewing is "request review",
// epc reviewing->finished is "accept review"). Returns an i18n key suffix.
export function transitionActionKey(
  role: PartyRole,
  current: ProjectStatus,
  target: ProjectStatus
): string {
  if (role === "sub") {
    if (target === "reviewing") return "requestReview";
    if (target === "active") return "withdrawReview";
  }
  if (target === "paused") return "pause";
  if (target === "cancelled") return "cancel";
  if (target === "finished") return current === "reviewing" ? "acceptReview" : "finish";
  if (target === "active") {
    if (current === "reviewing") return "sendBack";
    if (current === "draft") return "activate";
    return "resume";
  }
  return target;
}
