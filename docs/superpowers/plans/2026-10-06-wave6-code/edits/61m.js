// Task 6.1m (built from the 6.1b edit script without its FILE NAMES block): every existing document wears the new chrome. Run from the worktree root.
const fs = require("fs");
function edit(file, pairs) {
  // Task 6.1m: the Windows checkout has CRLF (core.autocrlf), the anchors are LF;
  // git stores LF either way, so the file is read and written with LF.
  let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
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

// ---------- strings.ts
edit("lib/pdf/strings.ts", [
  [
    `export function docString(locale: DocLocale, key: string): string {
  return lookupKey(CATALOGS[locale], key) ?? lookupKey(CATALOGS.sl, key) ?? key;
}
`,
    `export function docString(locale: DocLocale, key: string): string {
  return lookupKey(CATALOGS[locale], key) ?? lookupKey(CATALOGS.sl, key) ?? key;
}

/**
 * A document string with its {placeholders} filled. Plain replacement, not ICU:
 * document strings carry no plurals, and a value that itself contains braces
 * (a project named "{x}") must print as typed rather than be parsed.
 */
export function docText(
  locale: DocLocale,
  key: string,
  values: Record<string, string | number> = {},
): string {
  let out = docString(locale, key);
  for (const [name, value] of Object.entries(values)) {
    out = out.split(\`{\${name}}\`).join(String(value));
  }
  return out;
}

/** The project's language as a document locale; anything unknown prints Slovenian. */
export function docLocaleOf(language: string | null | undefined): DocLocale {
  return language === "de" || language === "en" ? language : "sl";
}
`,
  ],
  [`    generated: t("po.doc.generated"),\n  };`, `    generated: t("po.doc.generated"),\n    page: t("doc.page"),\n  };`],
  [`    generated: t("hours.doc.generated"),\n  };`, `    generated: t("hours.doc.generated"),\n    page: t("doc.page"),\n  };`],
  [`    crew: t("final.doc.crew"),\n    day: {`, `    crew: t("final.doc.crew"),\n    page: t("doc.page"),\n    day: {`],
  [`      generated: t("final.dayDoc.generated"),\n    },`, `      generated: t("final.dayDoc.generated"),\n      page: t("doc.page"),\n    },`],
  [`    generated: t("final.doc.generated"),\n  };`, `    generated: t("final.doc.generated"),\n    page: t("doc.page"),\n  };`],
  [`    regieLine: t("invoice.doc.regieLine"),\n  };`, `    regieLine: t("invoice.doc.regieLine"),\n    page: t("doc.page"),\n  };`],
]);

// ---------- narocilnica.tsx
edit("lib/pdf/narocilnica.tsx", [
  [
    'import { C, FlexTable, Footer, Header, LabelValue, styles } from "@/lib/pdf/theme";',
    'import { C, FlexTable, Footer, Header, LabelValue, RunningHeader, styles, type DocIssuer } from "@/lib/pdf/theme";',
  ],
  ["  perHour: string;\n}", "  perHour: string;\n  page: string;\n}"],
  [
    "  sha256?: string | null;\n  s: NarocilnicaStrings;",
    "  sha256?: string | null;\n  /** The EPC: the orderer issues the naročilnica. */\n  issuer: DocIssuer;\n  s: NarocilnicaStrings;",
  ],
  [
    `        <Header
          title={s.title}
          docNo={\`\${s.docNo} \${input.number}\`}
          projectName={input.projectName}
        />`,
    `        <RunningHeader title={s.title} docNo={\`\${s.docNo} \${input.number}\`} projectName={input.projectName} />
        <Header
          title={s.title}
          docNo={\`\${s.docNo} \${input.number}\`}
          projectName={input.projectName}
          issuer={input.issuer}
        />`,
  ],
  [
    "<Text style={{ color: C.inkSoft, lineHeight: 1.5 }}>{s.acceptanceBody}</Text>",
    "<Text style={[styles.body, { color: C.inkSoft }]}>{s.acceptanceBody}</Text>",
  ],
  ["        <Footer generatedLabel={s.generated} />", "        <Footer generatedLabel={s.generated} pageLabel={s.page} />"],
]);

// ---------- abnahme.tsx
edit("lib/pdf/abnahme.tsx", [
  [
    'import { C, FlexTable, Footer, Header, LabelValue, SignatureBox, styles } from "@/lib/pdf/theme";',
    'import { C, FlexTable, Footer, Header, LabelValue, RunningHeader, SignatureBox, styles, type DocIssuer } from "@/lib/pdf/theme";',
  ],
  ["  generated: string;\n}", "  generated: string;\n  page: string;\n}"],
  [
    "  subSigner: { name: string; image: Buffer | null };\n  s: AbnahmeStrings;",
    "  subSigner: { name: string; image: Buffer | null };\n  /** The EPC: the client conducts and issues the protocol. */\n  issuer: DocIssuer;\n  s: AbnahmeStrings;",
  ],
  [
    "        <Header title={s.title} projectName={input.projectName} />",
    "        <RunningHeader title={s.title} projectName={input.projectName} />\n        <Header title={s.title} projectName={input.projectName} issuer={input.issuer} />",
  ],
  ["<Text style={{ lineHeight: 1.5 }}>{s.penaltySentence}</Text>", "<Text style={styles.body}>{s.penaltySentence}</Text>"],
  ["<Text style={{ lineHeight: 1.5 }}>{input.note}</Text>", "<Text style={styles.body}>{input.note}</Text>"],
  ["        <Footer generatedLabel={s.generated} />", "        <Footer generatedLabel={s.generated} pageLabel={s.page} />"],
]);

// ---------- invoice.tsx
edit("lib/pdf/invoice.tsx", [
  [
    'import { C, FlexTable, Footer, Header, LabelValue, styles } from "@/lib/pdf/theme";',
    'import { C, FlexTable, Footer, Header, LabelValue, RunningHeader, styles, type DocIssuer } from "@/lib/pdf/theme";',
  ],
  ["  regieLine: string;\n}", "  regieLine: string;\n  page: string;\n}"],
  [
    "  reverseChargeNote: string | null;\n  s: InvoiceStrings;",
    "  reverseChargeNote: string | null;\n  /** The subcontractor: the supplier issues its own invoice. */\n  issuer: DocIssuer;\n  s: InvoiceStrings;",
  ],
  [
    "        <Header title={s.title} docNo={`${s.docNo} ${input.number}`} />",
    "        <RunningHeader title={s.title} docNo={`${s.docNo} ${input.number}`} />\n        <Header title={s.title} docNo={`${s.docNo} ${input.number}`} issuer={input.issuer} />",
  ],
  ["<Text style={{ lineHeight: 1.5 }}>{input.reverseChargeNote}</Text>", "<Text style={styles.body}>{input.reverseChargeNote}</Text>"],
  ["        <Footer generatedLabel={s.generated} />", "        <Footer generatedLabel={s.generated} pageLabel={s.page} />"],
]);

// ---------- regiebericht.tsx
edit("lib/pdf/regiebericht.tsx", [
  [
    'import { C, FlexTable, Footer, Header, LabelValue, styles } from "@/lib/pdf/theme";',
    'import { C, FlexTable, Footer, Header, LabelValue, RunningHeader, styles, type DocIssuer } from "@/lib/pdf/theme";',
  ],
  ["  hoursUnit: string;\n}", "  hoursUnit: string;\n  page: string;\n}"],
  [
    "  lines: { date: string; person: string | null; hours: number; description: string }[];\n  s: RegieberichtStrings;",
    "  lines: { date: string; person: string | null; hours: number; description: string }[];\n  /** The subcontractor. */\n  issuer: DocIssuer;\n  s: RegieberichtStrings;",
  ],
  [
    `        <Header
          title={s.title}
          docNo={\`\${s.docNo} \${input.number}\`}
          projectName={input.projectName}
        />`,
    `        <RunningHeader title={s.title} docNo={\`\${s.docNo} \${input.number}\`} projectName={input.projectName} />
        <Header
          title={s.title}
          docNo={\`\${s.docNo} \${input.number}\`}
          projectName={input.projectName}
          issuer={input.issuer}
        />`,
  ],
  [
    "<Text style={{ marginTop: 18, fontSize: 8.5, color: C.muted, lineHeight: 1.5 }}>",
    "<Text style={[styles.small, { marginTop: 18, color: C.muted }]}>",
  ],
  ["        <Footer generatedLabel={s.generated} />", "        <Footer generatedLabel={s.generated} pageLabel={s.page} />"],
]);

// ---------- day-report.tsx (6.2 replaces this file; this is the minimal 6.1 wiring)
edit("lib/pdf/day-report.tsx", [
  ['import { C, Footer, Header, styles } from "@/lib/pdf/theme";', 'import { C, Footer, Header, RunningHeader, styles, type DocIssuer } from "@/lib/pdf/theme";'],
  ["  people: string;\n}", "  people: string;\n  page: string;\n}"],
  [
    "export function DayReportPage({ day, s }: { day: DayReportData; s: DayReportStrings }) {",
    "export function DayReportPage({ day, s, issuer }: { day: DayReportData; s: DayReportStrings; issuer: DocIssuer }) {",
  ],
  [
    "      <Header title={s.title} docNo={`${s.reportNo} ${day.reportNo}`} projectName={day.dateLabel} />",
    "      <RunningHeader title={s.title} docNo={`${s.reportNo} ${day.reportNo}`} projectName={day.dateLabel} />\n      <Header title={s.title} docNo={`${s.reportNo} ${day.reportNo}`} projectName={day.dateLabel} issuer={issuer} />",
  ],
  ["{entry.note ? <Text style={{ lineHeight: 1.5 }}>{entry.note}</Text> : null}", "{entry.note ? <Text style={styles.body}>{entry.note}</Text> : null}"],
  ["<Text key={i} style={{ marginBottom: 3, lineHeight: 1.5 }}>", "<Text key={i} style={[styles.body, { marginBottom: 3 }]}>"],
  ["      <Footer generatedLabel={s.generated} />", "      <Footer generatedLabel={s.generated} pageLabel={s.page} />"],
  [
    `export function DayReportDocument({ day, s }: { day: DayReportData; s: DayReportStrings }) {
  return (
    <Document title={\`\${s.title} \${day.reportNo}\`}>
      <DayReportPage day={day} s={s} />`,
    `export function DayReportDocument({ day, s, issuer }: { day: DayReportData; s: DayReportStrings; issuer: DocIssuer }) {
  return (
    <Document title={\`\${s.title} \${day.reportNo}\`}>
      <DayReportPage day={day} s={s} issuer={issuer} />`,
  ],
]);

// ---------- completion.tsx
edit("lib/pdf/completion.tsx", [
  [
    'import { C, FlexTable, Footer, Header, LabelValue, StatTile, styles } from "@/lib/pdf/theme";',
    'import { FlexTable, Footer, Header, LabelValue, RunningHeader, StatTile, styles, type DocIssuer } from "@/lib/pdf/theme";',
  ],
  ["  crew: string;\n  day: DayReportStrings;", "  crew: string;\n  page: string;\n  day: DayReportStrings;"],
  [
    "  incidentRegister: { date: string; kindLabel: string; note: string }[];\n  s: CompletionStrings;",
    "  incidentRegister: { date: string; kindLabel: string; note: string }[];\n  /** The subcontractor: the report is its account of the job. */\n  issuer: DocIssuer;\n  s: CompletionStrings;",
  ],
  [
    "        <Header title={s.title} projectName={input.projectName} />",
    "        <RunningHeader title={s.title} projectName={input.projectName} />\n        <Header title={s.title} projectName={input.projectName} issuer={input.issuer} />",
  ],
  [
    `          emptyLabel={s.none}
        />

        {/* The shape of the job`,
    `          emptyLabel={s.none}
          hideHeader
        />

        {/* The shape of the job`,
  ],
  ["        <DayReportPage key={day.reportNo} day={day} s={s.day} />", "        <DayReportPage key={day.reportNo} day={day} s={s.day} issuer={input.issuer} />"],
  [
    "        <Header title={s.registers} projectName={input.projectName} />",
    "        <RunningHeader title={s.registers} projectName={input.projectName} />\n        <Header title={s.registers} projectName={input.projectName} issuer={input.issuer} />",
  ],
  [
    "        <Text style={{ marginTop: 20, fontSize: 8, color: C.muted }}>{s.generated}</Text>\n        <Footer generatedLabel={s.generated} />",
    "        <Footer generatedLabel={s.generated} pageLabel={s.page} />",
  ],
  ["        <Footer generatedLabel={s.generated} />", "        <Footer generatedLabel={s.generated} pageLabel={s.page} />"],
]);

// ---------- render-po.tsx
edit("lib/pdf/render-po.tsx", [
  ['import { renderDocument } from "@/lib/pdf/theme";', 'import { renderDocument } from "@/lib/pdf/theme";\nimport { loadLogo } from "@/lib/pdf/issuer";'],
  ['    .select("id, name, address, vat_id")', '    .select("id, name, address, vat_id, logo_path")'],
  [
    "      acceptance,\n      s: poStrings(locale),",
    "      acceptance,\n      issuer: { name: epc?.name ?? \"\", address: epc?.address ?? null, logo: await loadLogo(db, epc?.logo_path) },\n      s: poStrings(locale),",
  ],
]);

// ---------- acceptances.ts
edit("lib/data/acceptances.ts", [
  ['import { renderDocument } from "@/lib/pdf/theme";', 'import { renderDocument } from "@/lib/pdf/theme";\nimport { loadIssuer } from "@/lib/pdf/issuer";'],
  [
    '"name, language, address_street, address_zip, address_city, epc:epc_org_id (name), sub:sub_org_id (name)",',
    '"name, language, epc_org_id, address_street, address_zip, address_city, epc:epc_org_id (name), sub:sub_org_id (name)",',
  ],
  [
    "      subSigner: { name: row.sub_signer_name ?? \"\", image: await signature(row.sub_signature_path) },\n      s: abnahmeStrings(locale),",
    "      subSigner: { name: row.sub_signer_name ?? \"\", image: await signature(row.sub_signature_path) },\n      issuer: await loadIssuer(db, project.epc_org_id),\n      s: abnahmeStrings(locale),",
  ],
]);

// ---------- invoices.ts
edit("lib/data/invoices.ts", [
  ['import { renderDocument } from "@/lib/pdf/theme";', 'import { renderDocument } from "@/lib/pdf/theme";\nimport { loadIssuer } from "@/lib/pdf/issuer";'],
  [
    "      reverseChargeNote: invoice.reverse_charge_note,\n      s: invoiceStrings(locale),",
    "      reverseChargeNote: invoice.reverse_charge_note,\n      // The supplier issues its own invoice: the name and address are the\n      // snapshot printed in the parties block, the logo is the company's current one.\n      issuer: { name: supplier.name, address: supplier.address, logo: (await loadIssuer(db, invoice.sub_org_id)).logo },\n      s: invoiceStrings(locale),",
  ],
]);

// ---------- final-report.ts (6.2 restructures this; minimal 6.1 wiring)
edit("lib/data/final-report.ts", [
  ['import { renderDocument } from "@/lib/pdf/theme";', 'import { renderDocument } from "@/lib/pdf/theme";\nimport { loadIssuer } from "@/lib/pdf/issuer";'],
  [
    '"id, name, language, country, kwp, address_street, address_zip, address_city, planned_start, planned_end, epc:epc_org_id (name), sub:sub_org_id (name)"',
    '"id, name, language, country, kwp, sub_org_id, address_street, address_zip, address_city, planned_start, planned_end, epc:epc_org_id (name), sub:sub_org_id (name)"',
  ],
  ["      s: strings,\n    }),\n  );", "      issuer: await loadIssuer(db, project.sub_org_id),\n      s: strings,\n    }),\n  );"],
]);

// ---------- regie route: the issuer (6.1m)
edit("app/api/pdf/regie/[sheetId]/route.ts", [
  ['import { renderDocument } from "@/lib/pdf/theme";', 'import { renderDocument } from "@/lib/pdf/theme";\nimport { loadIssuer } from "@/lib/pdf/issuer";'],
  ['    .select("name, language, organizations:sub_org_id (name)")', '    .select("name, language, sub_org_id, organizations:sub_org_id (name)")'],
  ["      s: regieStrings(locale),\n    }),\n  );", "      issuer: await loadIssuer(db, project?.sub_org_id),\n      s: regieStrings(locale),\n    }),\n  );"],
]);

// ---------- existing tests
edit("tests/pdf-theme.test.tsx", [
  [
    '<Header title="Naročilnica" docNo="N-1" projectName="Belin test" />',
    '<Header title="Naročilnica" docNo="N-1" projectName="Belin test" issuer={{ name: "Solarna Gradnja d.o.o.", logo: null }} />',
  ],
]);
edit("tests/pdf-invoice.test.tsx", [
  [
    '    reverseChargeNote: mode === "reverse_charge" ? reverseChargeNote("si") : null,\n    s: invoiceStrings("sl"),',
    '    reverseChargeNote: mode === "reverse_charge" ? reverseChargeNote("si") : null,\n    issuer: { name: "AVESOL d.o.o.", logo: null },\n    s: invoiceStrings("sl"),',
  ],
]);
edit("tests/pdf-completion.test.tsx", [
  [
    '    incidentRegister: [{ date: "02. 08.", kindLabel: "Dež, prekinitev", note: "" }],\n    s: completionStrings("sl"),',
    '    incidentRegister: [{ date: "02. 08.", kindLabel: "Dež, prekinitev", note: "" }],\n    issuer: { name: "AVESOL d.o.o.", logo: null },\n    s: completionStrings("sl"),',
  ],
]);
edit("tests/pdf-abnahme.test.tsx", [
  [
    '    subSigner: { name: "Boštjan Novak", image: null },\n    s: abnahmeStrings("sl"),',
    '    subSigner: { name: "Boštjan Novak", image: null },\n    issuer: { name: "Sonce Energija d.o.o.", logo: null },\n    s: abnahmeStrings("sl"),',
  ],
]);
edit("tests/pdf-render-guard.test.ts", [
  [
    `  it("keeps the font re-registration inside the render helper", () => {`,
    `  // The double-spacing bug (documents H1) returns the moment a style says a
  // unitless lineHeight without its own fontSize: it then resolves against
  // @react-pdf's 18 point default. So every style object literal under lib/pdf
  // that says lineHeight must also say fontSize. styles.body and styles.small
  // do, the brochure's styles do, and a later template (Wave 8's pilot
  // agreement, the reklamacija) may write its own as long as it does too.
  it("never sets lineHeight without fontSize in the same style object", () => {
    const offenders: string[] = [];
    for (const file of walk("lib/pdf").map((f) => f.split("\\\\").join("/"))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\\{[^{}]*lineHeight[^{}]*\\}/g)) {
        if (!/fontSize/.test(match[0])) offenders.push(\`\${file}: \${match[0].replace(/\\s+/g, " ").slice(0, 90)}\`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the font re-registration inside the render helper", () => {`,
  ],
]);
