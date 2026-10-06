import { getLocale } from "next-intl/server";
import { DemoPersonaBar } from "@/components/demo/DemoPersonaBar";
import { HeaderLogout } from "@/components/auth/HeaderLogout";

// The right end of every command bar: the presenter's role switch (only after
// the Demo Door) and the account menu with Odjava (only with a session). Both
// decide for themselves whether to render, so a header just places this and
// never has to know who is looking. The locale is read from the request when
// the header does not have it, which is the case on the crew screens.
export async function HeaderSession({ locale }: { locale?: string }) {
  const lang = locale ?? (await getLocale());
  return (
    <>
      <DemoPersonaBar locale={lang} />
      <HeaderLogout locale={lang} />
    </>
  );
}
