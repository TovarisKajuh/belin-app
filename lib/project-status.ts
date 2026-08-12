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

// Narrow a raw DB string to ProjectStatus, failing loudly on an unknown value
// so a drift between the SQL CHECK and this union is caught, not silently cast.
export function asProjectStatus(value: string): ProjectStatus {
  if ((PROJECT_STATUSES as readonly string[]).includes(value)) return value as ProjectStatus;
  throw new Error(`Unknown project status: ${value}`);
}

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
  // The sub side can only WITHDRAW a review from the shared status control.
  //
  // Requesting one used to live here too, but declaring a job finished and
  // handing it over is the act that starts the acceptance, so it moved to its
  // own office-only action (requestFinalization). Leaving it here as well would
  // give the same state two doors, and only one of them would tell the client
  // it had happened. Withdrawing stays: taking your own request back is not a
  // contract-forming act, and a crew who requested review by mistake should be
  // able to undo it from the roof.
  switch (current) {
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
