import { getTranslations } from "next-intl/server";
import { logoutAction } from "@/app/actions/auth";

// Sits alongside the DEV swap pill while the demo login is in place, so the
// founder can move between the EPC and the sub account without clearing
// cookies by hand. Removed with the demo login in phase 3.
export async function LogoutPill({ locale }: { locale: string }) {
  const t = await getTranslations("auth");

  return (
    <form className="lp-logout" action={logoutAction}>
      <input type="hidden" name="locale" value={locale} />
      <button type="submit">{t("logout")}</button>
    </form>
  );
}
