import writeXlsxFile from 'write-excel-file/browser'

/**
 * Downloads an .xlsx file built from `headers` (column labels, in order)
 * and `rows` (arrays of cell values in the same order) — shared by the
 * student registry table and the per-event registrants table so an admin
 * can export exactly what they see on screen. `write-excel-file` only ever
 * writes files here (never parses one), unlike the more common `xlsx`
 * package, whose only published version has unpatched parser
 * vulnerabilities that don't apply to a write-only use case but are best
 * avoided anyway.
 */
export async function exportRowsToExcel({ filename, headers, rows }) {
  await writeXlsxFile([headers, ...rows]).toFile(filename)
}
