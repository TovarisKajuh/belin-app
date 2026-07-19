import { getTranslations } from "next-intl/server";
import { logoutAction } from "@/app/actions/auth";
import { PendingButton } from "./PendingButton";

// Sits alongside the DEV swap pill while the demo login is in place, so the
// founder can move between the EPC and the sub account without clearing
// cookies by hand. Removed with the demo login in phase 3.
export async function LogoutPill({
  locale,
  raised = false,
}: {
  locale: string;
  /** Lift clear of the crew screen's fixed submit bar. */
  raised?: boolean;
}) {
  const t = await getTranslations("auth");

  return (
    <form className={raised ? "lp-logout lp-logout--raised" : "lp-logout"} action={logoutAction}>
      <input type="hidden" name="locale" value={locale} />
      <PendingButton>{t("logout")}</PendingButton>
    </form>
  );
}
