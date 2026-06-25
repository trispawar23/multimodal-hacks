import { createHash } from "crypto";

/**
 * Encode a Commons filename the way MediaWiki thumb URLs do.
 * Only A–Z, a–z, 0–9, `_`, `-`, `(`, `)`, `.` stay literal.
 */
export function encodeCommonsFilename(filename: string): string {
  let out = "";
  for (const ch of filename) {
    if (/[A-Za-z0-9._\-]/.test(ch) || ch === "(" || ch === ")" || ch === ".") {
      out += ch;
    } else if (ch === "'") {
      out += "%27";
    } else {
      out += encodeURIComponent(ch);
    }
  }
  return out;
}

/** Build a stable Wikimedia Commons thumbnail URL from a file title. */
export function buildWikimediaThumbUrl(
  filename: string,
  width = 960
): string {
  const hash = createHash("md5").update(filename).digest("hex");
  const encoded = encodeCommonsFilename(filename);
  const path = `${hash[0]}/${hash.slice(0, 2)}`;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${encoded}/${width}px-${encoded}`;
}
