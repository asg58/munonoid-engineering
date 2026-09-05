import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { createDefaultProject } from '../src/core/munonoidCore.js'

test('MCP-server exposeert en voert Munonoid-tools uit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'munonoid-mcp-'))
  const projectFile = join(directory, 'project.json')
  await writeFile(projectFile, JSON.stringify(createDefaultProject()), 'utf8')

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve('mcp/server.mjs')],
    env: { ...process.env, MUNONOID_PROJECT_FILE: projectFile },
    stderr: 'pipe',
  })
  const client = new Client({ name: 'munonoid-test', version: '1.0.0' })

  try {
    await client.connect(transport)
    const tools = await client.listTools()
    assert.equal(tools.tools.length, 8)
    assert.ok(tools.tools.some((tool) => tool.name === 'set_munonoid_height'))

    const status = await client.callTool({ name: 'get_munonoid_status', arguments: {} })
    assert.equal(status.isError, undefined)
    assert.equal(status.structuredContent.height, 1650)

    const changed = await client.callTool({ name: 'set_munonoid_height', arguments: { height: 1700 } })
    assert.equal(changed.isError, undefined)
    assert.equal(changed.structuredContent.height, 1700)

    const saved = JSON.parse(await readFile(projectFile, 'utf8'))
    assert.equal(saved.robot.height, 1700)
  } finally {
    await client.close()
    await rm(directory, { recursive: true, force: true })
  }
})
