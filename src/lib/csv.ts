/**
 * CSV for spreadsheets. Cells starting with = + - @ (or a tab/CR) are
 * prefixed with an apostrophe so Excel and Sheets don't run them as formulas;
 * guest names and notes are user input.
 */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(
  header: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  // The BOM makes Excel read the file as UTF-8 (guest names, ₱ and the like).
  return `﻿${[header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}

/** Centavos as a plain decimal ("1234.50") so spreadsheets can sum the column. */
export function centavosToDecimal(centavos: number): string {
  const sign = centavos < 0 ? "-" : "";
  const abs = Math.abs(centavos);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
