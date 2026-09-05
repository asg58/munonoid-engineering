import test from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultProject, executeCommand, validateProject } from '../src/core/munonoidCore.js'

test('CLI-kern leest een geldige projectstatus', () => {
  const project = createDefaultProject()
  const response = executeCommand(project, 'get_status')
  assert.equal(response.changed, false)
  assert.equal(response.result.height, 1650)
  assert.equal(response.result.scale, '1:1')
  assert.equal(response.result.valid, true)
})

test('hoogtewijziging is begrensd en verhoogt de revisie', () => {
  const project = createDefaultProject()
  const response = executeCommand(project, 'set_height', { height: 1725 })
  assert.equal(response.project.robot.height, 1725)
  assert.equal(response.project.revision, 4)
  assert.throws(() => executeCommand(project, 'set_height', { height: 2100 }), { code: 'OUT_OF_RANGE' })
})

test('componentselectie en transformatie werken in millimeters', () => {
  let project = createDefaultProject()
  project = executeCommand(project, 'select_component', { componentId: 'leftShoulder' }).project
  project = executeCommand(project, 'set_transform', { componentId: 'leftShoulder', x: 312, y: 1428.5, yaw: 12 }).project
  assert.equal(project.robot.selectedComponent, 'leftShoulder')
  assert.deepEqual(project.transforms.leftShoulder.position, { x: 312, y: 1428.5, z: 210 })
  assert.equal(project.transforms.leftShoulder.rotation.yaw, 12)
})

test('BOM voorkomt dubbele part-ID’s', () => {
  const project = createDefaultProject()
  assert.throws(() => executeCommand(project, 'add_bom_item', {
    id: 'CAB-DYN-001', name: 'Dubbel', source: 'Test', sector: 'Test', mass: 1, price: 1,
  }), { code: 'DUPLICATE_PART' })
})

test('projectvalidatie controleert alle kernvoorwaarden', () => {
  const project = createDefaultProject()
  assert.equal(validateProject(project).passed, true)
  project.units = 'inch'
  assert.equal(validateProject(project).passed, false)
})
