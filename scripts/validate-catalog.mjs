import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(fs.readFileSync(path.join(root, 'catalog/component.schema.json'), 'utf8'))
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog/components.json'), 'utf8'))
const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)
const validate = ajv.compile(schema)

let valid = true
for (const component of catalog) {
  if (!validate(component)) {
    valid = false
    console.error(component.id, validate.errors)
  }
}
if (!valid) process.exit(1)
console.log(`${catalog.length} componentrecords geldig`)
