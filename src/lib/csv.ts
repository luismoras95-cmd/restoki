function escape(value: unknown): string {
  if (value === null || value === undefined) return ""
  let str = String(value)
  // Anti-inyección de fórmulas (CSV injection): si el valor empieza con un
  // carácter que Excel/Sheets interpreta como fórmula (= + - @ tab CR), le
  // anteponemos una comilla simple para que se muestre como texto literal.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Genera CSV listo para Excel/Sheets con BOM UTF-8 (preserva acentos).
 */
export function toCSV(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[]
): string {
  const BOM = "﻿"
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ]
  return BOM + lines.join("\r\n")
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10)
}
