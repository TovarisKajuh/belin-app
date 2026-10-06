import { getTranslations } from "next-intl/server";
import { CircleUserRound } from "lucide-react";
import { resolveActorFromSession } from "@/lib/auth";
import { isShotMode } from "@/lib/shot-mode";
import { logoutAction } from "@/app/actions/auth";
import { HeaderMenu } from "@/components/app/HeaderMenu";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Icon } from "@/components/ui/Icon";
import { PendingButton } from "./PendingButton";

// Odjava, in the command bar. It used to be a floating pill in the bottom left
// corner, where it covered crew tap targets and one stray thumb could sign the
// buyer's guest phone out mid-demo. Here it is two deliberate taps: the account
// button, then Odjava. Renders nothing without a session, so a project link
// opened by someone who never signed in shows no control that would do nothing.
//
// On a phone the language switch moves in here too (CSS hides the bar's copy
// when this menu is present): three language buttons plus the status, the
// role switch and this button did not fit a 360 px bar without touching the
// wordmark. Wide screens keep the language in the bar and never show this row.
export async function HeaderLogout({ locale }: { locale: string }) {
  if (await isShotMode()) return null;
  const actor = await resolveActorFromSession();
  if (!actor) return null;

  const t = await getTranslations("auth");
  const languageLabel = (await getTranslations("landing"))("languageLabel");
  return (
    <HeaderMenu
      className="hs-acct"
      summaryClassName="hs-acct-btn"
      label={t("accountMenu")}
      summary={<Icon icon={CircleUserRound} size={18} />}
    >
      <div className="hs-menu">
        {actor.kind === "person" ? <p className="hs-who">{actor.fullName}</p> : null}
        <div className="hs-lang">
          <span className="hs-lang-l">{languageLabel}</span>
          <LocaleSwitch label={languageLabel} />
        </div>
        <form action={logoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <PendingButton className="hs-out">{t("logout")}</PendingButton>
        </form>
      </div>
    </HeaderMenu>
  );
}
