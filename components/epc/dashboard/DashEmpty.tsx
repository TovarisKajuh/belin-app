import type { ReactNode } from "react";

// An empty section says what will appear here and, where somebody can make it
// appear, offers the action. A grey sentence alone reads as "broken".
//
// Same props and class names as components/ui/EmptyState.tsx from Task 5.1a,
// which is not on main yet: once it is, the dashboard imports that one and this
// file is deleted (logged as debt).
export function DashEmpty({
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

// Inline icons, drawn on lucide's 24 grid with its stroke, because lucide-react
// arrives with Task 5.1a. Decorative only: every use sits next to its words.
const S = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconClipboard({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...S}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </svg>
  );
}

export function IconCamera({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...S}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1 1 0 0 0 .8-.4l1-1.3a1 1 0 0 1 .8-.4h5.4a1 1 0 0 1 .8.4l1 1.3a1 1 0 0 0 .8.4h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

export function IconCircleCheck({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}

export function IconInbox({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...S}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export function IconMapPin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...S} strokeWidth={2}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...S} strokeWidth={2.4}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
