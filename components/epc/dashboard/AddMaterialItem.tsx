"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addMaterialItemAction } from "@/app/[locale]/p/[token]/actions";
import { parseQty } from "@/lib/materials-shared";

// EPC adds a line to the Stückliste. An explicit stopgap: the real list will be
// extracted from the uploaded plan PDF (design law 2, zero manual entry). Here
// it is the trigger the founder uses to raise the crew re-check prompt live.
export function AddMaterialItem({ token }: { token: string }) {
  const t = useTranslations("dashboard.material");
  const router = useRouter();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const parsed = parseQty(qty);
  const valid = name.trim() !== "" && unit.trim() !== "" && !Number.isNaN(parsed) && parsed > 0;

  async function onAdd() {
    if (busy || !valid) return;
    setBusy(true);
    setFailed(false);
    try {
      await addMaterialItemAction(token, { name: name.trim(), qty: parsed, unit: unit.trim() });
      setName("");
      setQty("");
      setUnit("");
      nameRef.current?.focus();
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mp-add">
      <div className="mp-add-h">{t("addItem")}</div>
      <div className="mp-add-row">
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("itemName")}
          aria-label={t("itemName")}
        />
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          inputMode="decimal"
          placeholder={t("itemQty")}
          aria-label={t("itemQty")}
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder={t("itemUnit")}
          aria-label={t("itemUnit")}
        />
        <button className="mp-add-btn" type="button" onClick={onAdd} disabled={busy || !valid}>
          {busy ? t("addPending") : t("addSubmit")}
        </button>
      </div>
      {failed && <p className="mp-add-err" role="alert">{t("addFailed")}</p>}
    </div>
  );
}
