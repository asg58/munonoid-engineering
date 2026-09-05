import test from 'node:test'
import assert from 'node:assert/strict'
import { assembly, initialParts } from '../src/data/project.js'
import { clampRobotHeight, filterParts, validateProjectData } from '../src/lib/projectChecks.js'

test('robothoogte blijft binnen het 1:1 ontwerpbereik', () => {
  assert.equal(clampRobotHeight(1100), 1200)
  assert.equal(clampRobotHeight(1650), 1650)
  assert.equal(clampRobotHeight(2100), 2000)
  assert.equal(clampRobotHeight('ongeldig'), 1650)
})

test('BOM-filter vindt onderdelen over alle zoekvelden', () => {
  assert.deepEqual(filterParts(initialParts, 'Dyneema').map((part) => part.id), ['CAB-DYN-001'])
  assert.deepEqual(filterParts(initialParts, 'marine').map((part) => part.id), ['CAB-DYN-001'])
  assert.equal(filterParts(initialParts, '').length, initialParts.length)
})

test('assemblage en marktcomponenten zijn volledig genoeg voor de editor', () => {
  assert.deepEqual(validateProjectData(assembly, initialParts), {
    assemblyOk: true,
    partsOk: true,
  })
})
