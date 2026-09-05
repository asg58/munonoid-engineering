import test from 'node:test'
import assert from 'node:assert/strict'
import { interpretCadCommand } from '../src/lib/cadCommand.js'

test('Nederlandse één-regelopdrachten sturen CAD en rendering veilig aan', () => {
  assert.deepEqual(interpretCadCommand('plaatbreedte naar 160 mm'), { type: 'parameter', key: 'plateWidth', value: 160 })
  assert.deepEqual(interpretCadCommand('Plaatbreedte = 162,5'), { type: 'parameter', key: 'plateWidth', value: 162.5 })
  assert.deepEqual(interpretCadCommand('toon CAD-randen'), { type: 'display', mode: 'cad' })
  assert.deepEqual(interpretCadCommand('maak het realistisch'), { type: 'display', mode: 'realistic' })
  assert.deepEqual(interpretCadCommand('render dit in 8K'), { type: 'render8k' })
})

test('onbekende opdrachten worden niet als CAD-feit uitgevoerd', () => {
  assert.deepEqual(interpretCadCommand('gebruik een willekeurig schouderlager'), { type: 'needs-engineering-data' })
  assert.deepEqual(interpretCadCommand(''), { type: 'none' })
})
