"use client";

import { usePathname } from "next/navigation";
import { switchPersonaAction } from "@/app/actions/demo";
import { HeaderMenu } from "@/components/app/HeaderMenu";

type Option = { persona: string; role: string; name: string };

/** "Boštjan Novak" to "BN": the compact chip on a phone. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (parts[0][0] + last).toUpperCase();
}

// Docked in the command bar, at its right end. It used to float in the bottom
// right corner, where it sat over the sub's "Potrdi podpis" in the acceptance
// flow. The chip names the role on a wide screen and shows the persona's
// initials on a phone; both are in the DOM, CSS picks one. The current path is
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
    // Keyed by the persona, so the menu is closed again once the switch lands.
    <HeaderMenu
      key={current}
      className="dm-switch"
      summaryClassName="dm-chip"
      label={switchLabel}
      summary={
        <>
          <span className="dm-chip-role">{active?.role ?? switchLabel}</span>
          <span className="dm-chip-ini" aria-hidden>
            {active ? initials(active.name) : "?"}
          </span>
        </>
      }
    >
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
    </HeaderMenu>
  );
}
