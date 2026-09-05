import { expose } from 'comlink'
import opencascade from 'replicad-opencascadejs'
import opencascadeWasm from 'replicad-opencascadejs/wasm?url'
import { exportSTEP, importSTEP, makeBox, makeCylinder, makeSphere, setOC } from 'replicad'

let ready
let rs02StepBlob
const VENDOR_MODELS = {
  RS02: { path: '/models/vendor/robstride-rs02.stp', color: '#252b30', material: 'black-anodized' },
  RS03: { path: '/models/vendor/robstride-rs03.stp', color: '#30373d', material: 'black-anodized' },
  RS04: { path: '/models/vendor/robstride-rs04.stp', color: '#343b41', material: 'black-anodized' },
  RS05: { path: '/models/vendor/robstride-rs05.step', color: '#252c31', material: 'black-anodized' },
}
function init() {
  if (!ready) ready = opencascade({ locateFile: () => opencascadeWasm }).then((oc) => setOC(oc))
  return ready
}

async function loadRs02() {
  if (!rs02StepBlob) {
    const response = await fetch('/models/vendor/robstride-rs02.stp')
    if (!response.ok) throw new Error(`Officiële RS02 STEP niet beschikbaar (${response.status})`)
    rs02StepBlob = await response.blob()
  }
  return importSTEP(rs02StepBlob)
}

function safeFillet(shape, radius) {
  try { return shape.fillet(radius) } catch { return shape }
}

function roundedBox(min, max, radius = 10) {
  return safeFillet(makeBox(min, max), radius)
}

function openFrame(min, max, insetX, insetZ, radius = 10) {
  const outer = roundedBox(min, max, radius)
  const inner = makeBox(
    [min[0] + insetX, min[1] - 4, min[2] + insetZ],
    [max[0] - insetX, max[1] + 4, max[2] - insetZ],
  )
  return outer.cut(inner)
}

function degrees(value) { return value * Math.PI / 180 }

const actuatorInstances = {
  RS05: [
    ['NECK-YAW', [0, 0, 1398], [0, 0, 0]], ['NECK-PITCH', [0, 0, 1450], [0, degrees(90), 0]],
    ['WRIST-L-PITCH', [-330, 0, 688], [0, degrees(90), 0]], ['WRIST-L-YAW', [-330, 0, 642], [0, 0, 0]],
    ['WRIST-R-PITCH', [330, 0, 688], [0, degrees(90), 0]], ['WRIST-R-YAW', [330, 0, 642], [0, 0, 0]],
  ],
  RS02: [
    ['SHO-L-YAW', [-327, 0, 1190], [degrees(90), 0, 0]], ['SHO-R-YAW', [327, 0, 1190], [degrees(90), 0, 0]],
    ['ELB-L', [-330, 0, 985], [0, degrees(90), 0]], ['ELB-R', [330, 0, 985], [0, degrees(90), 0]],
  ],
  RS03: [
    ['SHO-L-PITCH', [-242, 0, 1282], [0, degrees(90), 0]], ['SHO-L-ROLL', [-292, 0, 1282], [degrees(90), 0, 0]],
    ['SHO-R-PITCH', [242, 0, 1282], [0, degrees(90), 0]], ['SHO-R-ROLL', [292, 0, 1282], [degrees(90), 0, 0]],
    ['WAIST-YAW', [0, 0, 930], [0, 0, 0]], ['WAIST-PITCH', [0, 0, 865], [0, degrees(90), 0]],
    ['ANK-L-PITCH', [-105, 0, 115], [0, degrees(90), 0]], ['ANK-L-ROLL', [-105, 0, 70], [degrees(90), 0, 0]],
    ['ANK-R-PITCH', [105, 0, 115], [0, degrees(90), 0]], ['ANK-R-ROLL', [105, 0, 70], [degrees(90), 0, 0]],
  ],
  RS04: [
    ['HIP-L-YAW', [-105, 0, 775], [0, 0, 0]], ['HIP-L-ROLL', [-105, 0, 720], [degrees(90), 0, 0]], ['HIP-L-PITCH', [-105, 0, 665], [0, degrees(90), 0]],
    ['HIP-R-YAW', [105, 0, 775], [0, 0, 0]], ['HIP-R-ROLL', [105, 0, 720], [degrees(90), 0, 0]], ['HIP-R-PITCH', [105, 0, 665], [0, degrees(90), 0]],
    ['KNEE-L', [-105, 0, 405], [0, degrees(90), 0]], ['KNEE-R', [105, 0, 405], [0, degrees(90), 0]],
  ],
}

function structureShapes() {
  const shapes = [
    ['FRM-TORSO', '#66727a', 'aluminium', openFrame([-215, -115, 955], [215, 115, 1330], 52, 55, 24)],
    ['FRM-TORSO-SPINE', '#424b51', 'aluminium', roundedBox([-58, 88, 985], [58, 113, 1300], 10)],
    ['FRM-PELVIS', '#59646b', 'aluminium', openFrame([-175, -105, 745], [175, 105, 940], 48, 42, 22)],
    ['FRM-NECK', '#69757c', 'aluminium', roundedBox([-70, -70, 1360], [70, 70, 1460], 18)],
    ['HEAD-SHELL', '#30383e', 'carbon', makeSphere(108, [0, 0, 1542])],
    ['HEAD-VISOR', '#142b36', 'glass', roundedBox([-82, -112, 1515], [82, -92, 1575], 12)],
    ['ARM-L-UPPER', '#5d686f', 'aluminium', openFrame([-365, -62, 995], [-295, 62, 1230], 18, 32, 14)],
    ['ARM-R-UPPER', '#5d686f', 'aluminium', openFrame([295, -62, 995], [365, 62, 1230], 18, 32, 14)],
    ['ARM-L-LOWER', '#536067', 'aluminium', openFrame([-363, -56, 710], [-297, 56, 955], 17, 32, 13)],
    ['ARM-R-LOWER', '#536067', 'aluminium', openFrame([297, -56, 710], [363, 56, 955], 17, 32, 13)],
    ['HAND-L-MOUNT', '#323a40', 'carbon', roundedBox([-378, -64, 585], [-282, 64, 680], 18)],
    ['HAND-R-MOUNT', '#323a40', 'carbon', roundedBox([282, -64, 585], [378, 64, 680], 18)],
    ['LEG-L-UPPER', '#616d74', 'aluminium', openFrame([-148, -73, 425], [-62, 73, 660], 22, 34, 16)],
    ['LEG-R-UPPER', '#616d74', 'aluminium', openFrame([62, -73, 425], [148, 73, 660], 22, 34, 16)],
    ['LEG-L-LOWER', '#566269', 'aluminium', openFrame([-145, -66, 145], [-65, 66, 380], 20, 32, 15)],
    ['LEG-R-LOWER', '#566269', 'aluminium', openFrame([65, -66, 145], [145, 66, 380], 20, 32, 15)],
    ['FOOT-L', '#343d43', 'carbon', roundedBox([-178, -150, 0], [-32, 205, 72], 24)],
    ['FOOT-R', '#343d43', 'carbon', roundedBox([32, -150, 0], [178, 205, 72], 24)],
    ['BATTERY-48V', '#1e272c', 'battery', roundedBox([-128, 72, 1035], [128, 108, 1248], 10)],
    ['COMPUTE-JETSON', '#31523e', 'pcb', roundedBox([-92, -111, 1060], [92, -88, 1170], 7)],
  ]
  return shapes.map(([name, color, material, shape]) => ({ name, color, material, shape, instances: [{ name, position: [0, 0, 0], rotation: [0, 0, 0] }] }))
}

function boltInstances() {
  const instances = []
  for (const x of [-188, -145, 145, 188]) for (const z of [980, 1040, 1245, 1305]) instances.push({ name: `TORSO-M6-${instances.length + 1}`, position: [x, -118, z], rotation: [degrees(90), 0, 0] })
  for (const x of [-150, -105, 105, 150]) for (const z of [765, 915]) instances.push({ name: `PELVIS-M6-${instances.length + 1}`, position: [x, -108, z], rotation: [degrees(90), 0, 0] })
  return instances
}

const actuatorEnvelopeDimensions = {
  RS05: { diameter: 52, length: 43 },
  RS02: { diameter: 78.5, length: 45.4 },
  RS03: { diameter: 92, length: 58 },
  RS04: { diameter: 122, length: 72 },
}

function actuatorEnvelope(id) {
  const { diameter, length } = actuatorEnvelopeDimensions[id]
  const radius = diameter / 2
  const start = -length / 2
  let shape = makeCylinder(radius * 0.82, length, [0, 0, start])
  shape = shape.fuse(makeCylinder(radius, 5, [0, 0, start + length - 5]))
  shape = shape.fuse(makeCylinder(radius * 0.94, 5, [0, 0, start]))
  shape = shape.fuse(makeCylinder(radius * 0.27, 8, [0, 0, start + length]))
  shape = shape.cut(makeCylinder(radius * 0.12, length + 18, [0, 0, start - 4]))
  return shape
}

async function buildHumanoidPreview() {
  await init()
  const owned = structureShapes()
  const parts = []
  try {
    for (const record of owned) {
      parts.push({ name: record.name, color: record.color, material: record.material, instances: record.instances,
        faces: record.shape.mesh({ tolerance: 0.28, angularTolerance: 14 }), edges: record.shape.meshEdges({ tolerance: 0.28, angularTolerance: 14 }) })
    }
    for (const [id, instances] of Object.entries(actuatorInstances)) {
      const shape = actuatorEnvelope(id)
      owned.push({ shape })
      parts.push({ name: `MOT-${id}`, color: VENDOR_MODELS[id].color, material: VENDOR_MODELS[id].material,
        manufacturer: 'RobStride Dynamics', evidence: 'verified-dimension-envelope', instances: instances.map(([name, position, rotation]) => ({ name, position, rotation })),
        faces: shape.mesh({ tolerance: 0.2, angularTolerance: 12 }), edges: shape.meshEdges({ tolerance: 0.2, angularTolerance: 12 }) })
    }
    return { type: 'humanoid', heightMm: 1650, dof: 28, detail: 'verified-envelope', parts }
  } finally {
    owned.forEach(({ shape }) => shape?.delete())
  }
}

function validate(p) {
  const numeric = Object.entries(p)
  if (numeric.some(([, value]) => !Number.isFinite(value) || value <= 0)) throw new Error('Alle CAD-maten moeten positieve getallen zijn')
  if (p.bearingInner >= p.bearingOuter) throw new Error('Lager-binnendiameter moet kleiner zijn dan de buitendiameter')
  if (p.bore >= Math.min(p.plateWidth, p.plateHeight) - 24) throw new Error('Centrale boring past niet in de montageplaat')
}

function plate(p, z) {
  let shape = makeBox([-p.plateWidth / 2, -p.plateHeight / 2, z], [p.plateWidth / 2, p.plateHeight / 2, z + p.plateThickness])
  shape = shape.cut(makeCylinder(p.bore / 2, p.plateThickness, [0, 0, z]))
  for (const x of [-p.plateWidth / 2 + 18, p.plateWidth / 2 - 18]) {
    for (const y of [-p.plateHeight / 2 + 18, p.plateHeight / 2 - 18]) {
      shape = shape.cut(makeCylinder(3.3, p.plateThickness, [x, y, z]))
    }
  }
  return shape
}

function ring(outer, inner, length, z) {
  return makeCylinder(outer / 2, length, [0, 0, z]).cut(makeCylinder(inner / 2, length, [0, 0, z]))
}

async function createShapes(p) {
  validate(p)
  const motorZ = p.plateThickness + p.bearingWidth
  const rs02Length = 45.4
  const motorOutputZ = motorZ + rs02Length
  const outerPlateZ = motorOutputZ + p.capstanWidth
  const motor = (await loadRs02()).translate(0, 0, motorOutputZ)
  return [
    { name: 'SHO-PLATE-IN', color: '#87939e', shape: plate(p, 0) },
    { name: 'SHO-BEARING', color: '#c7d0d6', shape: ring(p.bearingOuter, p.bearingInner, p.bearingWidth, p.plateThickness) },
    { name: 'MOT-RS02', color: '#343b42', shape: motor },
    { name: 'SHO-CAPSTAN', color: '#39748a', shape: ring(p.capstanDiameter, p.shaftDiameter, p.capstanWidth, motorOutputZ) },
    { name: 'SHO-SHAFT', color: '#aab4bb', shape: makeCylinder(p.shaftDiameter / 2, outerPlateZ + p.plateThickness, [0, 0, 0]) },
    { name: 'SHO-PLATE-OUT', color: '#87939e', shape: plate(p, outerPlateZ) },
  ]
}

async function buildShoulder(parameters) {
  await init()
  const shapes = await createShapes(parameters)
  try {
    return shapes.map(({ name, color, shape }) => ({
      name, color,
      faces: shape.mesh({ tolerance: 0.12, angularTolerance: 12 }),
      edges: shape.meshEdges({ tolerance: 0.12, angularTolerance: 12 }),
    }))
  } finally {
    shapes.forEach(({ shape }) => shape.delete())
  }
}

async function exportShoulder(parameters) {
  await init()
  const shapes = await createShapes(parameters)
  try {
    return exportSTEP(shapes, { unit: 'MM', modelUnit: 'MM' })
  } finally {
    shapes.forEach(({ shape }) => shape.delete())
  }
}

expose({ buildShoulder, buildHumanoidPreview, exportShoulder })
