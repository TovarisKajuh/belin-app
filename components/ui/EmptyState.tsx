import type { ReactNode } from "react";

// An empty section says what will appear here and, where somebody can make it
// appear, offers the action. A grey sentence alone reads as "broken".
export function EmptyState({
  icon,
  title,
  body,
  action,
  compact = false,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "es es--compact" : "es"}>
      <span className="es-ic" aria-hidden>
        {icon}
      </span>
      <div className="es-t">{title}</div>
      {body ? <p className="es-b">{body}</p> : null}
      {action ? <div className="es-a">{action}</div> : null}
    </div>
  );
}
