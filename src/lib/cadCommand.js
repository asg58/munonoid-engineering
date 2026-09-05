export function interpretCadCommand(input) {
  const text = String(input || '').trim().toLowerCase()
  if (!text) return { type: 'none' }

  const width = text.match(/plaatbreedte\s*(?:naar|=)?\s*(\d+(?:[.,]\d+)?)/)
  if (width) return { type: 'parameter', key: 'plateWidth', value: Number(width[1].replace(',', '.')) }
  if (text.includes('8k') || text.includes('render')) return { type: 'render8k' }
  if (text.includes('rand') || text.includes('cad')) return { type: 'display', mode: 'cad' }
  if (text.includes('real')) return { type: 'display', mode: 'realistic' }
  return { type: 'needs-engineering-data' }
}
