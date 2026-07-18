import { getTranslations } from "next-intl/server";

// Shown only when the sub has requested review (status = reviewing). The EPC
// acts on it through the status control in the command bar, so this strip is
// informational and carries no separate action button.
export async function AlertStrip({ subName }: { subName: string }) {
  const t = await getTranslations("dashboard");
  return (
    <div className="e-alert">
      <div className="e-alert-in">
        <span className="e-alert-ic">!</span>
        <span className="e-alert-t">
          <b>{t("requestsReview", { sub: subName })}</b> {t("requestsReviewBody")}
        </span>
      </div>
    </div>
  );
}
