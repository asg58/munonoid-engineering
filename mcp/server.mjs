#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { createDefaultProject, executeCommand } from '../src/core/munonoidCore.js'

const defaultProjectFile = fileURLToPath(new URL('../munonoid.project.json', import.meta.url))
const projectFile = process.env.MUNONOID_PROJECT_FILE || defaultProjectFile

async function loadProject() {
  try {
    return JSON.parse(await readFile(projectFile, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return createDefaultProject()
    throw error
  }
}

async function saveProject(project) {
  const temporaryFile = `${projectFile}.tmp`
  await writeFile(temporaryFile, `${JSON.stringify(project, null, 2)}\n`, 'utf8')
  await rename(temporaryFile, projectFile)
}

async function runCommand(command, args, summary) {
  try {
    const current = await loadProject()
    const response = executeCommand(current, command, args)
    if (response.changed) await saveProject(response.project)
    const structuredContent = Array.isArray(response.result)
      ? { items: response.result }
      : response.result
    return {
      structuredContent,
      content: [{ type: 'text', text: summary(response.result) }],
    }
  } catch (error) {
    return {
      isError: true,
      structuredContent: { error: { code: error.code || 'MUNONOID_ERROR', message: error.message } },
      content: [{ type: 'text', text: `Munonoid-opdracht mislukt: ${error.message}` }],
    }
  }
}

const server = new McpServer(
  { name: 'munonoid-control', version: '0.4.0' },
  { instructions: 'Lees vóór wijzigingen eerst de Munonoid-status. Alle ontwerpmaten zijn millimeters op schaal 1:1. Deze server bestuurt alleen het digitale ontwerp; hij stuurt geen fysieke motoren aan.' },
)

server.registerTool('get_munonoid_status', {
  title: 'Lees Munonoid-status',
  description: 'Use this when the user wants the current robot project status, revision, scale, selection, mass, or validation state.',
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async () => runCommand('get_status', {}, (result) =>
  `${result.name}: ${result.height} mm, revisie ${result.revision}, ${result.bomItems} BOM-onderdelen, validatie ${result.valid ? 'geslaagd' : 'vereist aandacht'}.`,
))

server.registerTool('list_munonoid_components', {
  title: 'Toon robotonderdelen',
  description: 'Use this when the user wants to inspect which Munonoid assemblies and component identifiers can be selected or edited.',
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async () => runCommand('list_components', {}, (result) =>
  `${result.length} hoofdassemblages gevonden.`,
))

server.registerTool('select_munonoid_component', {
  title: 'Selecteer robotonderdeel',
  description: 'Use this when the user wants to focus the digital design on one known Munonoid component before inspecting or editing it.',
  inputSchema: { componentId: z.string().min(1).describe('Stable component ID returned by list_munonoid_components') },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async (args) => runCommand('select_component', args, (result) =>
  `Onderdeel ${result.selectedComponent} is geselecteerd.`,
))

server.registerTool('set_munonoid_height', {
  title: 'Stel robothoogte in',
  description: 'Use this when the user wants to change the full-scale Munonoid robot height between 1200 and 2000 millimeters.',
  inputSchema: { height: z.number().min(1200).max(2000).describe('Robot height in millimeters') },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async (args) => runCommand('set_height', args, (result) =>
  `Robothoogte ingesteld op ${result.height} ${result.unit}, schaal ${result.scale}.`,
))

server.registerTool('set_munonoid_transform', {
  title: 'Verplaats of roteer onderdeel',
  description: 'Use this when the user wants to position a known Munonoid component in millimeters or rotate it in degrees in the digital design.',
  inputSchema: {
    componentId: z.string().min(1).describe('Stable component ID returned by list_munonoid_components'),
    x: z.number().min(-3000).max(3000).optional().describe('X position in millimeters'),
    y: z.number().min(-3000).max(3000).optional().describe('Y position in millimeters'),
    z: z.number().min(-3000).max(3000).optional().describe('Z position in millimeters'),
    roll: z.number().min(-360).max(360).optional().describe('Roll rotation in degrees'),
    pitch: z.number().min(-360).max(360).optional().describe('Pitch rotation in degrees'),
    yaw: z.number().min(-360).max(360).optional().describe('Yaw rotation in degrees'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async (args) => runCommand('set_transform', args, (result) =>
  `${result.componentId} bijgewerkt: positie ${JSON.stringify(result.position)}, rotatie ${JSON.stringify(result.rotation)}.`,
))

server.registerTool('list_munonoid_bom', {
  title: 'Lees Munonoid-BOM',
  description: 'Use this when the user wants to review the current bill of materials, sources, sectors, masses, prices, or engineering status.',
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async () => runCommand('list_bom', {}, (result) =>
  `${result.length} BOM-onderdelen gevonden.`,
))

server.registerTool('add_munonoid_bom_item', {
  title: 'Voeg BOM-onderdeel toe',
  description: 'Use this when the user has chosen a real or custom component and wants to add it to the Munonoid bill of materials.',
  inputSchema: {
    id: z.string().min(1).describe('Unique part ID'),
    name: z.string().min(1).describe('Component name'),
    source: z.string().min(1).describe('Supplier or manufacturing source'),
    sector: z.string().min(1).describe('Industry sector'),
    status: z.string().default('concept').describe('Engineering status'),
    mass: z.number().min(0).describe('Mass in kilograms'),
    price: z.number().min(0).describe('Estimated price in euros'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async (args) => runCommand('add_bom_item', args, (result) =>
  `${result.id} (${result.name}) is aan de BOM toegevoegd.`,
))

server.registerTool('validate_munonoid_project', {
  title: 'Valideer Munonoid-project',
  description: 'Use this when the user wants to check the current digital robot project for unit, scale, height, selection, BOM, and identifier consistency.',
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async () => runCommand('validate_project', {}, (result) =>
  `Projectvalidatie ${result.passed ? 'geslaagd' : 'mislukt'}: ${result.checks.filter((check) => check.passed).length}/${result.checks.length} controles geslaagd.`,
))

const transport = new StdioServerTransport()
await server.connect(transport)
