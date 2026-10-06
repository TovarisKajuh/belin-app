// Task 6.1m part B: the Zapisnik's declaration, warranty, penalty box and both signatures are ONE block.
const fs = require("fs");
const file = "lib/pdf/abnahme.tsx";
let s = fs.readFileSync(file, "utf8");
if (s.includes("ONE UNBREAKABLE BLOCK")) {
  console.log("already applied", file);
  process.exit(0);
}
const start = s.indexOf("        <View style={{ marginTop: 16 }}>\n          <LabelValue label={s.declaration}");
const end = s.indexOf("        <Footer generatedLabel={s.generated} pageLabel={s.page} />");
if (start < 0 || end < 0 || end < start) throw new Error(`${file}: closing block anchors missing; apply by hand`);
const block = `        {input.note ? (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.sectionTitle}>{s.note}</Text>
            <Text style={styles.body}>{input.note}</Text>
          </View>
        ) : null}

        {/* ONE UNBREAKABLE BLOCK: declaration, warranty start, penalty box and
            both signatures. A signature page without the declaration on it is a
            page anybody could staple to anything (documents H7). */}
        <View wrap={false} style={{ marginTop: 16 }}>
          <LabelValue label={s.declaration} value={input.declarationLabel} />
          {input.warrantyStart ? <LabelValue label={s.warranty} value={input.warrantyStart} /> : null}

          {/* Printed ONLY when reserved. Silence here is meaningful: a document
              that mentioned penalties in every case would make a reservation
              that was never made look like one that was. */}
          {input.penaltyReserved ? (
            <View style={{ marginTop: 12, padding: 10, borderWidth: 1, borderColor: C.ink }}>
              <Text style={{ fontWeight: 700, marginBottom: 4 }}>{s.penaltyTitle}</Text>
              <Text style={styles.body}>{s.penaltySentence}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 26, flexDirection: "row", justifyContent: "space-between" }}>
            <SignatureBox name={input.epcSigner.name} image={input.epcSigner.image} caption={s.signEpc} />
            <SignatureBox name={input.subSigner.name} image={input.subSigner.image} caption={s.signSub} />
          </View>
        </View>

`;
s = s.slice(0, start) + block + s.slice(end);
fs.writeFileSync(file, s);
console.log("edited", file);
