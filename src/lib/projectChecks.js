export function clampRobotHeight(value) {
  return Math.max(1200, Math.min(2000, Number(value) || 1650))
}

export function filterParts(parts, query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return parts

  return parts.filter((part) =>
    `${part.id} ${part.name} ${part.source} ${part.sector}`.toLowerCase().includes(needle),
  )
}

export function validateProjectData(assembly, parts) {
  const assemblyOk = assembly.length > 0 && assembly.every((group) =>
    group.id && group.label && Array.isArray(group.children) && group.children.length > 0,
  )
  const partsOk = parts.length > 0 && parts.every((part) =>
    part.id && part.name && part.source && part.sector && part.status
    && Number.isFinite(part.mass) && Number.isFinite(part.price),
  )

  return { assemblyOk, partsOk }
}
