import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ProjectStatusControl } from "@/components/project/ProjectStatusControl";
import { BelinMark } from "@/components/BelinMark";
import type { ProjectStatus } from "@/lib/project-status";

// The shared header for both parties. The EPC and the crew get the identical
// bar (mark, wordmark, project, status control) so the two sides read as one
// product; only the status control's permitted transitions differ by role.
export async function CommandBar({
  token,
  projectId,
  projectName,
  meta,
  status,
  role,
  locale,
}: {
  /** Null on a signed-in session; the link token otherwise. */
  token: string | null;
  projectId: string;
  projectName: string;
  /** Secondary line: the sub company for the EPC, the site address for the crew. */
  meta: string | null;
  status: ProjectStatus;
  role: "epc" | "sub";
  /**
   * Present only on the EPC side, where it turns on the office navigation
   * (project list, new project). The crew never sees it: a phone on a roof
   * gets one screen, not a menu.
   */
  locale?: string;
}) {
  const navLabel = locale ? (await getTranslations("projects"))("title") : null;

  return (
    <div className="e-bar">
      <div className="e-bar-in">
        <div className="e-brand">
          <BelinMark />
          <span className="e-wm">BELIN</span>
          <span className="e-bproj">
            <b>{projectName}</b>
          </span>
        </div>
        <div className="e-br">
          {meta && <span className="e-upd">{meta}</span>}
          {role === "epc" && locale && (
            <Link href={`/${locale}/app/projects`} className="cb-nav">
              {navLabel}
            </Link>
          )}
          <ProjectStatusControl token={token} projectId={projectId} role={role} status={status} />
        </div>
      </div>
    </div>
  );
}
