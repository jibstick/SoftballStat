export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoking on the next tick, not immediately, matters: mobile Safari in
  // particular hands the object URL to its download handling asynchronously,
  // so revoking synchronously right after click() can yank the blob out from
  // under a save that hasn't actually started yet — the download silently
  // never lands. This is also why "Export All" needs to space its downloads
  // out (see exportAll in StatsPage) rather than firing them in one tick.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
