import { getTranslations } from "next-intl/server";
import { switchScenarioAction } from "@/app/actions/auth";
import type { Scenario } from "@/lib/auth-shared";

// Demo control: flips between the half-built project and the same job at day
// one, so the founder can show and test both the "project in flight" screens
// and the "nothing logged yet" screens (material check, empty log, zero
// progress). Goes with the demo login in phase 3.
export async function ScenarioPill({
  locale,
  scenario,
  raised = false,
}: {
  locale: string;
  scenario: Scenario;
  /** Lift clear of the crew screen's fixed submit bar. */
  raised?: boolean;
}) {
  const t = await getTranslations("auth");
  const isStart = scenario === "start";

  return (
    <form className={raised ? "lp-scenario lp-scenario--raised" : "lp-scenario"} action={switchScenarioAction}>
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" title={t("scenarioSwitch")}>
        <span className={isStart ? "on" : undefined}>{t("scenarioStart")}</span>
        <span className={isStart ? undefined : "on"}>{t("scenarioCurrent")}</span>
      </button>
    </form>
  );
}
