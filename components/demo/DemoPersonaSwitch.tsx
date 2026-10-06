"use client";

import { usePathname } from "next/navigation";
import { switchPersonaAction } from "@/app/actions/demo";

type Option = { persona: string; role: string; name: string };

// A <details> menu: opens and closes with no client state. The current path is
// the one client signal here, and it only decides where the switch LANDS; the
// server re-checks everything before it acts.
export function DemoPersonaSwitch({
  locale,
  current,
  switchLabel,
  options,
}: {
  locale: string;
  current: string;
  switchLabel: string;
  options: Option[];
}) {
  const pathname = usePathname();
  const active = options.find((o) => o.persona === current);
  return (
    <details className="dm-switch">
      <summary className="dm-chip" aria-label={switchLabel}>
        {active?.role ?? switchLabel}
      </summary>
      <div className="dm-menu">
        {options.map((o) => (
          <form key={o.persona} action={switchPersonaAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="persona" value={o.persona} />
            <input type="hidden" name="path" value={pathname} />
            <button
              type="submit"
              className="dm-opt"
              data-persona={o.persona}
              aria-current={o.persona === current ? "true" : undefined}
              disabled={o.persona === current}
            >
              {o.role}
              <span>{o.name}</span>
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}
