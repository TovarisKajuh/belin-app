import { ProjectStatusControl } from "@/components/project/ProjectStatusControl";
import { BelinMark } from "@/components/BelinMark";
import type { ProjectStatus } from "@/lib/project-status";

// The shared header for both parties. The EPC and the crew get the identical
// bar (mark, wordmark, project, status control) so the two sides read as one
// product; only the status control's permitted transitions differ by role.
export function CommandBar({
  token,
  projectName,
  meta,
  status,
  role,
}: {
  token: string;
  projectName: string;
  /** Secondary line: the sub company for the EPC, the site address for the crew. */
  meta: string | null;
  status: ProjectStatus;
  role: "epc" | "sub";
}) {
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
          <ProjectStatusControl token={token} role={role} status={status} />
        </div>
      </div>
    </div>
  );
}
