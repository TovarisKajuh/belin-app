import "server-only";
import { NextResponse } from "next/server";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor, type PersonActor, type ProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";

// The PDF access matrix, once, for every document route Wave 6 adds.
//
// 1. PERSON SESSIONS ONLY. A project link is refused even though it opens the
//    project's screens: links get forwarded to WhatsApp groups.
// 2. NEVER CREW. The office reads the paperwork; crew never see money (D11).
// 3. A PARTY TO THE PROJECT, or the same 404 a missing document gets, so a
//    route never confirms that somebody else's document exists.
//
// The five routes that existed before keep their own inline checks, which say
// the same thing; they were not rewritten for a demo night.

export type DocReader =
  | { ok: true; actor: PersonActor; project: ProjectActor }
  | { ok: false; response: NextResponse };

export async function documentReader(projectId: string): Promise<DocReader> {
  if (!isUuid(projectId)) return { ok: false, response: new NextResponse("Not found", { status: 404 }) };

  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person" || actor.role === "crew") {
    return { ok: false, response: new NextResponse("Forbidden", { status: 403 }) };
  }

  try {
    return { ok: true, actor, project: await requireProjectActor(actor, projectId) };
  } catch {
    return { ok: false, response: new NextResponse("Not found", { status: 404 }) };
  }
}

/** A PDF response that is never cached by a shared cache. */
export function pdfResponse(bytes: Buffer | Uint8Array, disposition: string): NextResponse {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

export function notFound(): NextResponse {
  return new NextResponse("Not found", { status: 404 });
}
