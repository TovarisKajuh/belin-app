import type { LucideIcon } from "lucide-react";

// One way to draw an icon: 16 px, 1.75 stroke, hidden from assistive tech
// unless it carries meaning on its own (then pass a label).
export function Icon({
  icon: Glyph,
  size = 16,
  strokeWidth = 1.75,
  label,
  className,
}: {
  icon: LucideIcon;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}) {
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      className={className ? `ui-icon ${className}` : "ui-icon"}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    />
  );
}
