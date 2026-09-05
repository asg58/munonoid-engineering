import { assembly, initialParts } from '../data/project.js'

export const COMPONENT_IDS = assembly.map((group) => group.id)

const DEFAULT_TRANSFORMS = Object.fromEntries(COMPONENT_IDS.map((id) => [id, {
  position: { x: 0, y: 0, z: 0 },
  rotation: { roll: 0, pitch: 0, yaw: 0 },
}]))

DEFAULT_TRANSFORMS.rightShoulder.position = { x: 312, y: 1428.5, z: 210 }
DEFAULT_TRANSFORMS.leftShoulder.position = { x: -312, y: 1428.5, z: 210 }
DEFAULT_TRANSFORMS.torso.position = { x: 0, y: 810, z: 0 }

export function createDefaultProject() {
  return {
    schemaVersion: 1,
    projectId: 'munonoid-v0',
    name: 'Munonoid Engineering CAD',
    revision: 3,
    units: 'mm',
    scale: '1:1',
    robot: { height: 1650, selectedComponent: 'rightShoulder' },
    transforms: structuredClone(DEFAULT_TRANSFORMS),
    bom: structuredClone(initialParts),
    events: [],
  }
}

function commandError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function finiteNumber(value, name) {
  const number = Number(value)
  if (!Number.isFinite(number)) throw commandError('INVALID_NUMBER', `${name} moet een geldig getal zijn`)
  return number
}

function assertComponent(project, componentId) {
  if (!project.transforms[componentId]) {
    throw commandError('UNKNOWN_COMPONENT', `Onbekend onderdeel: ${componentId}`)
  }
}

function addEvent(project, command, detail) {
  return {
    ...project,
    revision: project.revision + 1,
    events: [...project.events.slice(-99), {
      revision: project.revision + 1,
      command,
      detail,
      at: new Date().toISOString(),
    }],
  }
}

export function validateProject(project) {
  const checks = [
    { id: 'schema', label: 'Projectstructuur', passed: project.schemaVersion === 1 },
    { id: 'units', label: 'Eenheden millimeter', passed: project.units === 'mm' && project.scale === '1:1' },
    { id: 'height', label: 'Robothoogte', passed: project.robot.height >= 1200 && project.robot.height <= 2000 },
    { id: 'selection', label: 'Geselecteerd onderdeel', passed: Boolean(project.transforms[project.robot.selectedComponent]) },
    { id: 'bom', label: 'BOM-gegevens', passed: project.bom.length > 0 && project.bom.every((part) => part.id && part.name && Number.isFinite(part.mass) && Number.isFinite(part.price)) },
    { id: 'part-ids', label: 'Unieke part-ID’s', passed: new Set(project.bom.map((part) => part.id)).size === project.bom.length },
  ]
  return { passed: checks.every((check) => check.passed), checks }
}

export function executeCommand(inputProject, command, args = {}) {
  let project = structuredClone(inputProject)

  switch (command) {
    case 'get_status': {
      const validation = validateProject(project)
      const knownMass = project.bom.reduce((total, part) => total + part.mass, 0)
      return { project, changed: false, result: {
        projectId: project.projectId,
        name: project.name,
        revision: project.revision,
        units: project.units,
        scale: project.scale,
        height: project.robot.height,
        selectedComponent: project.robot.selectedComponent,
        bomItems: project.bom.length,
        knownMass: Number(knownMass.toFixed(3)),
        valid: validation.passed,
      } }
    }
    case 'list_components':
      return { project, changed: false, result: assembly.map((group) => ({ id: group.id, label: group.label, children: group.children })) }
    case 'select_component': {
      assertComponent(project, args.componentId)
      project.robot.selectedComponent = args.componentId
      project = addEvent(project, command, { componentId: args.componentId })
      return { project, changed: true, result: { selectedComponent: args.componentId, transform: project.transforms[args.componentId] } }
    }
    case 'set_height': {
      const height = finiteNumber(args.height, 'Hoogte')
      if (height < 1200 || height > 2000) throw commandError('OUT_OF_RANGE', 'Robothoogte moet tussen 1200 en 2000 mm liggen')
      project.robot.height = height
      project = addEvent(project, command, { height, unit: 'mm' })
      return { project, changed: true, result: { height, unit: 'mm', scale: '1:1' } }
    }
    case 'set_transform': {
      const { componentId } = args
      assertComponent(project, componentId)
      const transform = structuredClone(project.transforms[componentId])
      const updates = {}
      for (const axis of ['x', 'y', 'z']) {
        if (args[axis] === undefined) continue
        const value = finiteNumber(args[axis], axis.toUpperCase())
        if (Math.abs(value) > 3000) throw commandError('OUT_OF_RANGE', `${axis.toUpperCase()} moet tussen -3000 en 3000 mm liggen`)
        transform.position[axis] = value
        updates[axis] = value
      }
      for (const axis of ['roll', 'pitch', 'yaw']) {
        if (args[axis] === undefined) continue
        const value = finiteNumber(args[axis], axis)
        if (Math.abs(value) > 360) throw commandError('OUT_OF_RANGE', `${axis} moet tussen -360 en 360 graden liggen`)
        transform.rotation[axis] = value
        updates[axis] = value
      }
      if (Object.keys(updates).length === 0) throw commandError('NO_CHANGES', 'Geef minimaal één positie- of rotatiewaarde op')
      project.transforms[componentId] = transform
      project = addEvent(project, command, { componentId, ...updates })
      return { project, changed: true, result: { componentId, ...transform } }
    }
    case 'list_bom':
      return { project, changed: false, result: project.bom }
    case 'add_bom_item': {
      const part = {
        id: String(args.id || '').trim(),
        name: String(args.name || '').trim(),
        source: String(args.source || '').trim(),
        sector: String(args.sector || '').trim(),
        status: String(args.status || 'concept').trim(),
        mass: finiteNumber(args.mass, 'Massa'),
        price: finiteNumber(args.price, 'Prijs'),
      }
      if (!part.id || !part.name || !part.source || !part.sector) throw commandError('MISSING_FIELD', 'Part-ID, naam, bron en sector zijn verplicht')
      if (part.mass < 0 || part.price < 0) throw commandError('OUT_OF_RANGE', 'Massa en prijs mogen niet negatief zijn')
      if (project.bom.some((item) => item.id === part.id)) throw commandError('DUPLICATE_PART', `Part-ID bestaat al: ${part.id}`)
      project.bom.push(part)
      project = addEvent(project, command, { partId: part.id })
      return { project, changed: true, result: part }
    }
    case 'validate_project':
      return { project, changed: false, result: validateProject(project) }
    case 'get_snapshot':
      return { project, changed: false, result: project }
    default:
      throw commandError('UNKNOWN_COMMAND', `Onbekende opdracht: ${command}`)
  }
}
