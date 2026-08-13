"use server";

import { redirect } from "next/navigation";
import { claimCrewIdentity } from "@/lib/data/crew";
import { startPersonSession } from "@/lib/auth";

/**
 * The one moment a project link authenticates anything: turning a held link
 * into a named session.
 *
 * After this the link is finished on this device. The session it mints is what
 * opens the app tomorrow morning, from the home screen, with no URL involved.
 */
export async function claimCrewAction(
  locale: string,
  token: string,
  choice: { personId: string } | { newName: string },
): Promise<{ error: "invalid" | "name" } | void> {
  const result = await claimCrewIdentity(token, choice);
  if (!result.ok) return { error: result.error };

  await startPersonSession(result.personId);
  redirect(`/${locale}/app/${result.projectId}`);
}
