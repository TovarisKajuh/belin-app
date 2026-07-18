import { ProjectStatusControl } from "@/components/project/ProjectStatusControl";
import type { ProjectStatus } from "@/lib/project-status";

// A rising-gold cell pattern, a tiny echo of the launch mark (3 wide, 4 tall).
const MARK = [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1];

export function CommandBar({
  token,
  projectName,
  subName,
  status,
}: {
  token: string;
  projectName: string;
  subName: string | null;
  status: ProjectStatus;
}) {
  return (
    <div className="e-bar">
      <div className="e-bar-in">
        <div className="e-brand">
          <span className="e-mark" aria-hidden>
            {MARK.map((v, i) => (
              <i key={i} className={v ? "g" : undefined} />
            ))}
          </span>
          <span className="e-wm">BELIN</span>
          <span className="e-bproj">
            <b>{projectName}</b>
          </span>
        </div>
        <div className="e-br">
          {subName && <span className="e-upd">{subName}</span>}
          <ProjectStatusControl token={token} role="epc" status={status} />
        </div>
      </div>
    </div>
  );
}
