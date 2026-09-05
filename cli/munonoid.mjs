#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createDefaultProject, executeCommand } from '../src/core/munonoidCore.js'

const argv = process.argv.slice(2)
const jsonOutput = argv.includes('--json')
const dryRun = argv.includes('--dry-run')
const args = argv.filter((arg) => arg !== '--json' && arg !== '--dry-run')
const projectFile = resolve(process.env.MUNONOID_PROJECT_FILE || 'munonoid.project.json')

function parseFlags(values) {
  const result = {}
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (!value.startsWith('--')) continue
    result[value.slice(2)] = values[index + 1]
    index += 1
  }
  return result
}

async function loadProject() {
  if (!existsSync(projectFile)) return createDefaultProject()
  return JSON.parse(await readFile(projectFile, 'utf8'))
}

async function saveProject(project) {
  const temporaryFile = `${projectFile}.tmp`
  await writeFile(temporaryFile, `${JSON.stringify(project, null, 2)}\n`, 'utf8')
  await rename(temporaryFile, projectFile)
}

function resolveCommand(values) {
  const [first, second, third, ...rest] = values
  if (!first || first === 'help' || first === '--help') return { command: 'help' }
  if (first === 'init') return { command: 'init' }
  if (first === 'status') return { command: 'get_status' }
  if (first === 'components') return { command: 'list_components' }
  if (first === 'select') return { command: 'select_component', args: { componentId: second } }
  if (first === 'height') return { command: 'set_height', args: { height: second } }
  if (first === 'move') return { command: 'set_transform', args: { componentId: second, ...parseFlags([third, ...rest].filter(Boolean)) } }
  if (first === 'rotate') return { command: 'set_transform', args: { componentId: second, ...parseFlags([third, ...rest].filter(Boolean)) } }
  if (first === 'bom' && second === 'list') return { command: 'list_bom' }
  if (first === 'bom' && second === 'add') return { command: 'add_bom_item', args: parseFlags([third, ...rest].filter(Boolean)) }
  if (first === 'validate') return { command: 'validate_project' }
  if (first === 'snapshot') return { command: 'get_snapshot' }
  return { command: first, args: parseFlags(values.slice(1)) }
}

function printHelp() {
  console.log(`Munonoid CLI v0.3

Gebruik:
  munonoid init
  munonoid status [--json]
  munonoid components [--json]
  munonoid select <component-id>
  munonoid height <mm>
  munonoid move <component-id> --x <mm> --y <mm> --z <mm>
  munonoid rotate <component-id> --roll <deg> --pitch <deg> --yaw <deg>
  munonoid bom list [--json]
  munonoid bom add --id <id> --name <naam> --source <bron> --sector <sector> --mass <kg> --price <eur>
  munonoid validate [--json]
  munonoid snapshot --json

Opties:
  --dry-run   Controleer een wijziging zonder hem op te slaan
  --json      Machineleesbare uitvoer voor AI/MCP`)
}

function printResult(command, result) {
  if (jsonOutput) {
    console.log(JSON.stringify({ ok: true, command, result, dryRun }, null, 2))
    return
  }
  if (command === 'get_status') {
    console.log(`${result.name} · revisie ${result.revision}\nHoogte: ${result.height} mm · schaal ${result.scale}\nSelectie: ${result.selectedComponent}\nBOM: ${result.bomItems} onderdelen · ${result.knownMass} kg bekend\nValidatie: ${result.valid ? 'GELDIG' : 'CONTROLE NODIG'}`)
    return
  }
  if (command === 'validate_project') {
    for (const check of result.checks) console.log(`${check.passed ? '✓' : '✗'} ${check.label}`)
    console.log(result.passed ? 'Projectvalidatie geslaagd' : 'Projectvalidatie mislukt')
    return
  }
  console.log(JSON.stringify(result, null, 2))
}

try {
  const request = resolveCommand(args)
  if (request.command === 'help') {
    printHelp()
    process.exit(0)
  }
  if (request.command === 'init') {
    if (existsSync(projectFile)) throw Object.assign(new Error(`Project bestaat al: ${projectFile}`), { code: 'PROJECT_EXISTS' })
    const project = createDefaultProject()
    if (!dryRun) await saveProject(project)
    printResult('init', { projectFile, created: !dryRun, projectId: project.projectId })
    process.exit(0)
  }

  const project = await loadProject()
  const response = executeCommand(project, request.command, request.args)
  if (response.changed && !dryRun) await saveProject(response.project)
  printResult(request.command, response.result)
} catch (error) {
  const payload = { ok: false, error: { code: error.code || 'CLI_ERROR', message: error.message } }
  if (jsonOutput) console.error(JSON.stringify(payload, null, 2))
  else console.error(`Fout [${payload.error.code}]: ${payload.error.message}`)
  process.exit(1)
}
