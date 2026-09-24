// Google Sheets "gviz" CSV export helpers.

const SHEET_ID = "1MXI-E8nCXdapBxh6hl3f2-Lb-NYeTbTISQX_zhzK5og";
/** The picks tab (by gid). */
export const PICKS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=1393032348`;
/** Any other tab, by name: sheetUrl("Equities") */
export const sheetUrl = (tab: string) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;

export async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.text();
}

export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    out.push(row);
  }
  return out.filter((r) => r.some((c) => c.trim() !== ""));
}

/** "$1,170.68" → 1170.68; junk → null */
export function num(s: unknown): number | null {
  const n = parseFloat(String(s ?? "").replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? n : null;
}

/** Accepts 2026-09-22, 9/22/2026, 9/22/26. Seasons roll over in August. */
export function normalizeDate(raw: string) {
  const s = String(raw).trim();
  let y: number, m: number, d: number;
  let mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (mt) {
    y = +mt[1];
    m = +mt[2];
    d = +mt[3];
  } else {
    mt = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
    if (!mt) return null;
    m = +mt[1];
    d = +mt[2];
    y = +mt[3];
    if (y < 100) y += 2000;
  }
  if (!m || !d) return null;
  return {
    label: String(m).padStart(2, "0") + "/" + String(d).padStart(2, "0") + "/" + String(y).slice(2),
    sortKey: y * 10000 + m * 100 + d,
    season: String(m >= 8 ? y : y - 1),
  };
}
