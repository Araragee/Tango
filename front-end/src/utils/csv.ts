/**
 * Quote and escape one CSV cell, neutralising spreadsheet formulas: a
 * partner-entered title like `=HYPERLINK(...)` would otherwise execute when the
 * export is opened in Excel/Sheets (CSV injection). Prefixing `'` makes the
 * spreadsheet treat it as text.
 */
export function csvCell(value: unknown): string {
  let v = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  return `"${v.replace(/"/g, '""')}"`
}
