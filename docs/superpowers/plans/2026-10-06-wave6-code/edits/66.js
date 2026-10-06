// Task 6.6: the change-order card links its PDF wherever money is shown (Task 5.10's showMoney).
const fs = require("fs");
function edit(file, pairs) {
  let s = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    // Idempotent: a pair already applied (its replacement is present) is skipped,
    // so a rerun after a hand fix never duplicates an import.
    if (s.includes(b)) continue;
    if (!s.includes(a)) throw new Error(`${file}: miss ${a.slice(0, 90)}`);
    s = s.split(a).join(b);
  }
  fs.writeFileSync(file, s);
  console.log("edited", file);
}

const file = "components/hours/ChangeOrderList.tsx";
const source = fs.readFileSync(file, "utf8");
if (!/\bshowMoney\b/.test(source)) {
  // Task 5.10 shipped without showMoney (its RED fallback): add the narrower
  // canOpenPdf prop instead (default false, so the project-link page needs no
  // change), passed from HoursTabs and the signed-in hours page.
  throw new Error("No showMoney in ChangeOrderList: apply the canOpenPdf fallback in the step below by hand.");
}

edit(file, [
  ['  const t = useTranslations("co");', '  const t = useTranslations("co");\n  const tDoc = useTranslations("doc.ui");'],
  [
    `              ) : order.authorName ? (
                <p className="ip-who">{order.authorName}</p>
              ) : null}`,
    `              ) : order.authorName ? (
                <p className="ip-who">{order.authorName}</p>
              ) : null}

              {/* The PDF carries the amount, so it shows exactly where money shows (D11). */}
              {showMoney ? (
                <a className="hr-pdf" href={\`/api/pdf/co/\${order.id}\`} target="_blank" rel="noreferrer">
                  {tDoc("coPdf")}
                </a>
              ) : null}`,
  ],
]);
