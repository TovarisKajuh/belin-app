"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Country } from "@/lib/hours-shared";
import type { HourSheet } from "@/lib/hours-view";
import type { ChangeOrderRow } from "@/lib/change-orders-view";
import { SheetList } from "./SheetList";
import { ChangeOrderList } from "./ChangeOrderList";

// Regiestunden and Nachträge on one screen.
//
// They are the same conversation from the subcontractor's side, "this costs
// more than we agreed", and splitting them across two places in the navigation
// would mean an EPC has to remember two screens to find money they have not
// approved yet. The tab carries a count so an unopened tab still says there is
// something waiting.

export function HoursTabs({
  actionKey,
  projectId,
  locale,
  country,
  role,
  canDecide,
  sheets,
  orders,
  initialTab,
  showMoney = true,
}: {
  actionKey: string;
  projectId: string;
  locale: "sl" | "de" | "en";
  country: Country;
  role: "epc" | "sub";
  canDecide: boolean;
  sheets: HourSheet[];
  orders: ChangeOrderRow[];
  initialTab: "hours" | "co";
  /** False for crew and link surfaces (D11): change orders show no price. */
  showMoney?: boolean;
}) {
  const t = useTranslations("hours");
  const [tab, setTab] = useState<"hours" | "co">(initialTab);

  const openSheets = sheets.filter((sheet) => sheet.status === "submitted").length;
  const openOrders = orders.filter((order) => order.status === "submitted").length;

  return (
    <>
      <div className="hr-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "hours"}
          className={`hr-tab${tab === "hours" ? " on" : ""}`}
          onClick={() => setTab("hours")}
        >
          {t("tabHours")}
          {openSheets > 0 ? <span className="hr-tab-n">{openSheets}</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "co"}
          className={`hr-tab${tab === "co" ? " on" : ""}`}
          onClick={() => setTab("co")}
        >
          {t("tabCo")}
          {openOrders > 0 ? <span className="hr-tab-n">{openOrders}</span> : null}
        </button>
      </div>

      {tab === "hours" ? (
        <SheetList
          actionKey={actionKey}
          projectId={projectId}
          country={country}
          role={role}
          canDecide={canDecide}
          sheets={sheets}
        />
      ) : (
        <ChangeOrderList
          actionKey={actionKey}
          projectId={projectId}
          locale={locale}
          role={role}
          canDecide={canDecide}
          orders={orders}
          showMoney={showMoney}
        />
      )}
    </>
  );
}
