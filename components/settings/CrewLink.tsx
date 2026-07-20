"use client";

import { useTranslations } from "next-intl";
import { ShareLink } from "@/components/share/ShareLink";

// The crew's way onto a site: one link, sent by whatever the crew already uses.
// No account, no password, no app install, because the person opening it is
// standing on a roof.
export function CrewLink({ name, url }: { name: string; url: string }) {
  const t = useTranslations("settings");
  const tShare = useTranslations("share");

  return (
    <div className="st-card">
      <h3 className="st-h">{name}</h3>
      <ShareLink
        url={url}
        subject={t("crewShareSubject")}
        message={t("crewShareMessage", { project: name })}
        labels={{
          copy: tShare("copy"),
          copied: tShare("copied"),
          share: tShare("share"),
          whatsapp: tShare("whatsapp"),
          email: tShare("email"),
        }}
      />
    </div>
  );
}
