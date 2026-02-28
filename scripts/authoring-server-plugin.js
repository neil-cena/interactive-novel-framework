/**
 * Vite plugin: authoring API (load/validate/save). Node-only; uses data-core/io.
 */

import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { readCsv, readRawFile, writeFileInDir } from './data-core/io.js'
import {
  parseNodes,
  parseItems,
  parseEnemies,
  parseEncounters,
} from './data-core/parse.js'
import { validateData } from './data-core/validate.js'
import { analyzeGraph } from './data-core/graph.js'
import {
  serializeNodesToCsv,
  serializeItemsToCsv,
  serializeEnemiesToCsv,
  serializeEncountersToCsv,
} from './data-core/export-csv.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..') // scripts/ -> project root

export function authoringServerPlugin() {
  const csvDir = path.join(projectRoot, 'data', 'csv')
  const draftFileName = '.authoring-draft.json'

  return {
    name: 'authoring-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/authoring/load' && req.method === 'GET') {
          handleLoad(req, res, csvDir)
          return
        }
        if (req.url === '/api/authoring/validate' && req.method === 'POST') {
          collectBody(req, (err, body) => {
            if (err) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
              return
            }
            handleValidate(body, res)
          })
          return
        }
        if (req.url === '/api/authoring/save' && req.method === 'POST') {
          collectBody(req, (err, body) => {
            if (err) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
              return
            }
            handleSave(body, res, csvDir)
          })
          return
        }
        if (req.url === '/api/authoring/save-draft' && req.method === 'POST') {
          collectBody(req, (err, body) => {
            if (err) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
              return
            }
            handleSaveDraft(body, res, csvDir, draftFileName)
          })
          return
        }
        if (req.url === '/api/authoring/load-draft' && req.method === 'GET') {
          handleLoadDraft(res, csvDir, draftFileName)
          return
        }
        next()
      })
    },
  }
}

function collectBody(req, cb) {
  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body || '{}')
      cb(null, parsed)
    } catch (e) {
      cb(new Error('Invalid JSON body'))
    }
  })
  req.on('error', (e) => cb(e))
}

function handleLoad(req, res, csvDir) {
  try {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const itemsRows = readCsv(csvDir, 'items.csv')
    const enemiesRows = readCsv(csvDir, 'enemies.csv')
    const encountersRows = readCsv(csvDir, 'encounters.csv')
    const nodes = parseNodes(nodesRows)
    const items = parseItems(itemsRows)
    const enemies = parseEnemies(enemiesRows)
    const encounters = parseEncounters(encountersRows)
    const { errors, warnings } = validateData(nodes, items, enemies, encounters)
    const { diagnostics: graphDiagnostics } = analyzeGraph(nodes, encounters)
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        nodes,
        items,
        enemies,
        encounters,
        errors,
        warnings: [...warnings, ...graphDiagnostics],
      }),
    )
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message }))
  }
}

function handleValidate(body, res) {
  const { nodes = {}, items = {}, enemies = {}, encounters = {} } = body
  const { errors, warnings } = validateData(nodes, items, enemies, encounters)
  const { diagnostics: graphDiagnostics } = analyzeGraph(nodes, encounters)
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      errors,
      warnings: [...warnings, ...graphDiagnostics],
    }),
  )
}

function handleSave(body, res, csvDir) {
  const { nodes = {}, items = {}, enemies = {}, encounters = {} } = body
  const { errors, warnings } = validateData(nodes, items, enemies, encounters)
  if (errors.length > 0) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Validation failed', errors, warnings }))
    return
  }
  const ts = Date.now()
  const backupSuffix = `.bak.${ts}`
  const files = [
    { name: 'nodes.csv', content: serializeNodesToCsv(nodes) },
    { name: 'items.csv', content: serializeItemsToCsv(items) },
    { name: 'enemies.csv', content: serializeEnemiesToCsv(enemies) },
    { name: 'encounters.csv', content: serializeEncountersToCsv(encounters) },
  ]
  const written = []
  const backups = []
  try {
    for (const f of files) {
      try {
        const raw = readRawFile(csvDir, f.name)
        const backupName = f.name + backupSuffix
        writeFileInDir(csvDir, backupName, raw)
        backups.push(path.join(csvDir, backupName))
      } catch (_) {
        // No existing file to backup
      }
      writeFileInDir(csvDir, f.name, f.content)
      written.push(path.join(csvDir, f.name))
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        success: true,
        written,
        backups,
        warnings,
      }),
    )
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message }))
  }
}

function handleSaveDraft(body, res, csvDir, draftFileName) {
  const payload = {
    savedAt: new Date().toISOString(),
    model: {
      nodes: body?.nodes ?? {},
      items: body?.items ?? {},
      enemies: body?.enemies ?? {},
      encounters: body?.encounters ?? {},
    },
  }
  try {
    writeFileInDir(csvDir, draftFileName, JSON.stringify(payload, null, 2))
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, path: path.join(csvDir, draftFileName), savedAt: payload.savedAt }))
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message }))
  }
}

function handleLoadDraft(res, csvDir, draftFileName) {
  const fullPath = path.join(csvDir, draftFileName)
  try {
    if (!fs.existsSync(fullPath)) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ exists: false }))
      return
    }
    const raw = readRawFile(csvDir, draftFileName)
    const parsed = JSON.parse(raw || '{}')
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        exists: true,
        savedAt: parsed.savedAt,
        model: parsed.model ?? { nodes: {}, items: {}, enemies: {}, encounters: {} },
      }),
    )
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message }))
  }
}
