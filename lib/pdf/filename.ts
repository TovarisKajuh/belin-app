// Download file names a person can file: the document's own title in the
// project's language, its number, the project, and a date where one matters.
//
// Two spellings go out in one Content-Disposition header. `filename` is plain
// ASCII for old clients and for file systems that mangle anything else;
// `filename*` carries the real name in UTF-8 under RFC 5987, so a browser that
// supports it saves "Naročilnica-1-PSE-Trgovski-center-Kranj.pdf" with its č.

const FOLD: Record<string, string> = {
  ß: "ss",
  ẞ: "SS",
  đ: "d",
  Đ: "D",
  ø: "o",
  Ø: "O",
  æ: "ae",
  Æ: "AE",
  ł: "l",
  Ł: "L",
};

export function documentFilename(
  parts: (string | number | null | undefined)[],
  extension = "pdf",
): { ascii: string; utf8: string } {
  const words = parts
    .filter((part) => part !== null && part !== undefined && String(part).trim() !== "")
    .map((part) => String(part).trim());

  const utf8 = words
    .join(" ")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/[.,;]+(?=\s|$)/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

  const ascii = utf8
    .replace(/[ßẞđĐøØæÆłŁ]/g, (c) => FOLD[c] ?? c)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return { ascii: `${ascii || "dokument"}.${extension}`, utf8: `${utf8 || "dokument"}.${extension}` };
}

export function contentDisposition(
  parts: (string | number | null | undefined)[],
  disposition: "inline" | "attachment" = "inline",
): string {
  const { ascii, utf8 } = documentFilename(parts);
  const encoded = encodeURIComponent(utf8).replace(
    /['()*!]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
