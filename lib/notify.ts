import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl } from "@/lib/app-url";
import { renderEmail, sendEmail } from "@/lib/email";
import { notifyProject } from "@/lib/realtime-server";
import {
  emailBodyKey,
  emailSubjectKey,
  formatTemplate,
  lookupKey,
  recipientsFor,
  wantsEmail,
  type NotifyKind,
} from "@/lib/notify-shared";
import sl from "@/messages/sl.json";
import de from "@/messages/de.json";
import en from "@/messages/en.json";

// The event engine. One call per thing that happened, and everything that
// should follow from it happens here: the audit row, the in-app inbox, the
// emails, and the live refresh ping.
//
// Why one function instead of each write path doing its own fanout: the
// recipient policy is a legal-ish decision (who is entitled to know that a
// naročilnica was accepted) and it must be identical everywhere. lib/notify-shared
// holds the policy table; this file is the only thing that acts on it.
//
// THE RULE: emitEvent NEVER throws. It runs after a write that already
// succeeded, so a failure here must never turn a saved report into an error
// message on a roof. Everything is logged and swallowed.

const CATALOGS: Record<string, unknown> = { sl, de, en };

// Who counts as reachable office staff on each side. Crew people are absent by
// design: they are reached through the project surface itself, not their inbox
// (they may not even have an account).
const EPC_ROLES = ["admin", "bauleiter", "owner"];
const SUB_ROLES = ["admin", "owner"];

type ProjectContext = {
  id: string;
  name: string;
  language: string;
  epcOrgId: string;
  subOrgId: string | null;
};

export type EmitEventInput = {
  projectId: string;
  kind: NotifyKind;
  /** people.id of whoever acted, or null when a crew link did it. */
  actorPerson: string | null;
  /**
   * Small, already rendered values interpolated into the subject and body
   * templates. Numbers and dates arrive as strings, formatted by the caller:
   * emails carry no ICU and no live formatting.
   */
  payload?: Record<string, string>;
  /**
   * True for events whose database function already wrote the activity row
   * (submit_daily_report and submit_material_check both do). Without it those
   * two events appear twice in the feed.
   */
  skipActivity?: boolean;
};

/**
 * Fire an event without making the caller wait for it. Next's after() runs the
 * work once the response has been flushed, which keeps a crew member's submit
 * fast on weak LTE even when several emails go out.
 *
 * The fallback matters: after() only exists inside a request, so anything
 * calling a data function from a script (the seed, a one-off backfill) falls
 * back to awaiting the emit rather than crashing.
 */
export async function emitEventDeferred(input: EmitEventInput): Promise<void> {
  try {
    after(async () => {
      await emitEvent(input);
    });
  } catch {
    await emitEvent(input);
  }
}

export async function emitEvent(input: EmitEventInput): Promise<void> {
  const { projectId, kind, actorPerson, payload = {}, skipActivity = false } = input;

  try {
    const db = createAdminClient();

    if (!skipActivity) {
      const { error } = await db.from("activity").insert({
        project_id: projectId,
        kind,
        payload,
        actor_person: actorPerson,
      });
      if (error) logFailure("activity insert", error.message);
    }

    const project = await loadProject(db, projectId);
    if (!project) {
      logFailure("project lookup", `no project ${projectId}`);
      return;
    }

    const catalog = CATALOGS[project.language] ?? CATALOGS.sl;
    const vars = await buildVars(db, catalog, project, actorPerson, payload);
    const recipients = await loadRecipients(db, project, kind);

    if (recipients.length > 0) {
      const { error } = await db.from("notifications").insert(
        recipients.map((person) => ({
          recipient_person: person.id,
          project_id: projectId,
          kind,
          payload: vars,
        })),
      );
      if (error) logFailure("notifications insert", error.message);
    }

    await sendEmails(catalog, project, kind, vars, recipients);
  } catch (err) {
    logFailure("emitEvent", err instanceof Error ? err.message : String(err));
  } finally {
    // The ping is last and always runs: even if the fanout failed, any open
    // dashboard should still re-read the data the write produced.
    await notifyProject(projectId).catch(() => {});
  }
}

async function loadProject(
  db: ReturnType<typeof createAdminClient>,
  projectId: string,
): Promise<ProjectContext | null> {
  const { data } = await db
    .from("projects")
    .select("id, name, language, epc_org_id, sub_org_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    language: data.language ?? "sl",
    epcOrgId: data.epc_org_id,
    subOrgId: data.sub_org_id,
  };
}

type Recipient = { id: string; email: string | null; prefs: unknown };

async function loadRecipients(
  db: ReturnType<typeof createAdminClient>,
  project: ProjectContext,
  kind: NotifyKind,
): Promise<Recipient[]> {
  const sides = recipientsFor(kind);
  const out: Recipient[] = [];

  for (const side of sides) {
    const orgId = side === "epc" ? project.epcOrgId : project.subOrgId;
    // A project without a subcontractor yet is normal (the wizard allows it),
    // so a missing sub side is silence, not an error.
    if (!orgId) continue;

    const { data } = await db
      .from("people")
      .select("id, email, notification_prefs")
      .eq("org_id", orgId)
      .in("role", side === "epc" ? EPC_ROLES : SUB_ROLES);

    for (const person of data ?? []) {
      out.push({ id: person.id, email: person.email, prefs: person.notification_prefs });
    }
  }

  return out;
}

/**
 * The interpolation variables. {project} is always available, and {author} is
 * filled in from the acting person's name when the caller did not supply one,
 * falling back to the localized crew label for a link actor. Doing it here
 * means no call site has to know the project's language to name the actor.
 */
async function buildVars(
  db: ReturnType<typeof createAdminClient>,
  catalog: unknown,
  project: ProjectContext,
  actorPerson: string | null,
  payload: Record<string, string>,
): Promise<Record<string, string>> {
  const vars: Record<string, string> = { project: project.name, ...payload };

  if (!vars.author) {
    if (actorPerson) {
      const { data } = await db
        .from("people")
        .select("full_name")
        .eq("id", actorPerson)
        .maybeSingle();
      if (data?.full_name) vars.author = data.full_name;
    }
    vars.author ??= lookupKey(catalog, "notify.actorCrew") ?? "";
  }

  return vars;
}

async function sendEmails(
  catalog: unknown,
  project: ProjectContext,
  kind: NotifyKind,
  vars: Record<string, string>,
  recipients: Recipient[],
): Promise<void> {
  const subjectTpl = lookupKey(catalog, emailSubjectKey(kind));
  const bodyTpl = lookupKey(catalog, emailBodyKey(kind));
  if (!subjectTpl || !bodyTpl) {
    logFailure("catalog", `missing subject or body for ${kind}`);
    return;
  }

  const base = appBaseUrl();
  const subject = formatTemplate(subjectTpl, vars);
  const body = formatTemplate(bodyTpl, vars);
  const ctaLabel = lookupKey(catalog, "notify.cta") ?? "Belin";

  for (const person of recipients) {
    if (!person.email) continue;
    if (!wantsEmail(person.prefs, kind)) continue;

    if (!base) {
      // No base URL means every link in the mail would be dead. Refuse and
      // record the refusal rather than shipping a button that goes nowhere:
      // exactly the failure that took the production login down on 2026-07-20,
      // and the email_log row is what made that one diagnosable in minutes.
      await sendEmail({
        to: person.email,
        kind: `notify:${kind}`,
        projectId: project.id,
        subject,
        html: "",
        refuseReason: "no-base-url",
      }).catch(() => {});
      continue;
    }

    const html = renderEmail(
      subject,
      [body],
      ctaLabel,
      `${base}/${project.language}/app/${project.id}`,
    );

    const result = await sendEmail({
      to: person.email,
      kind: `notify:${kind}`,
      projectId: project.id,
      subject,
      html,
    });
    if (!result.sent && result.reason !== "demo-domain") logFailure("email", `${kind}: ${result.reason}`);
  }
}

// Logs in every environment: a notification that silently fails in production
// is exactly the failure that went unnoticed for days in October 2026.
function logFailure(stage: string, message: string): void {
  console.error(`[notify] ${stage}: ${message}`);
}
