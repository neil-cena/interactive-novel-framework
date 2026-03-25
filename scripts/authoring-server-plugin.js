/**
 * Vite plugin: authoring API (load/validate/save). Node-only; uses data-core/io.
 */

import path from 'node:path'
import fs from 'node:fs'
import { Buffer } from 'node:buffer'
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
import { getReleaseGraphAnalyzeOptions } from './data-core/qa-bind-options.js'
import { getQaProfile } from './data-core/qa-profiles.js'
import { evaluateStructuralQaOutcome } from './data-core/qa-orchestrator.js'
import { QA_REPORT_ENVELOPE_VERSION } from './data-core/qa-envelope.js'
import {
  serializeNodesToCsv,
  serializeItemsToCsv,
  serializeEnemiesToCsv,
  serializeEncountersToCsv,
} from './data-core/export-csv.js'
import { buildCurrentModelFromCsv, validateAssets } from './data-core/package-io.js'
import { isValidPackageManifest, sanitizeModelTextFields } from './data-core/package-schema.js'
import { runStructuralQa } from './data-core/qa-exhaustive.js'
import { formatQaReportMarkdown } from './data-core/qa-report-md.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..') // scripts/ -> project root

const QA_EXHAUSTIVE_BODY_LIMIT = 5 * 1024 * 1024
/** Max JSON body for validate / save / save-draft / import-package (bytes). */
const AUTHORING_JSON_BODY_LIMIT = 8 * 1024 * 1024

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
          if (!assertAuthoringAuth(req, res)) return
          collectBodyCapped(req, AUTHORING_JSON_BODY_LIMIT, (err, body) => {
            if (err?.message === 'PAYLOAD_TOO_LARGE') {
              res.statusCode = 413
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Request body too large' }))
              return
            }
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
          if (!assertAuthoringAuth(req, res)) return
          collectBodyCapped(req, AUTHORING_JSON_BODY_LIMIT, (err, body) => {
            if (err?.message === 'PAYLOAD_TOO_LARGE') {
              res.statusCode = 413
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Request body too large' }))
              return
            }
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
          if (!assertAuthoringAuth(req, res)) return
          collectBodyCapped(req, AUTHORING_JSON_BODY_LIMIT, (err, body) => {
            if (err?.message === 'PAYLOAD_TOO_LARGE') {
              res.statusCode = 413
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Request body too large' }))
              return
            }
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
        if (req.url === '/api/authoring/export-package' && req.method === 'GET') {
          handleExportPackage(res, csvDir)
          return
        }
        if (req.url === '/api/authoring/import-package' && req.method === 'POST') {
          if (!assertAuthoringAuth(req, res)) return
          collectBodyCapped(req, AUTHORING_JSON_BODY_LIMIT, (err, body) => {
            if (err?.message === 'PAYLOAD_TOO_LARGE') {
              res.statusCode = 413
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Request body too large' }))
              return
            }
            if (err) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
              return
            }
            handleImportPackage(body, res, csvDir)
          })
          return
        }
        if (req.url === '/api/authoring/qa-exhaustive' && req.method === 'POST') {
          if (!assertAuthoringAuth(req, res)) return
          collectBodyCapped(req, QA_EXHAUSTIVE_BODY_LIMIT, (err, body) => {
            if (err?.message === 'PAYLOAD_TOO_LARGE') {
              res.statusCode = 413
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Request body too large' }))
              return
            }
            if (err) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
              return
            }
            handleQaExhaustive(body, res)
          })
          return
        }
        next()
      })
    },
  }
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {boolean}
 */
function assertAuthoringAuth(req, res) {
  const tok = process.env.AUTHORING_API_TOKEN
  if (!tok) return true
  const raw = req.headers.authorization ?? req.headers.Authorization
  const h = Array.isArray(raw) ? raw[0] : raw
  if (typeof h !== 'string' || h !== `Bearer ${tok}`) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return false
  }
  return true
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {number} maxBytes
 * @param {(err: Error | null, body?: unknown) => void} cb
 */
function collectBodyCapped(req, maxBytes, cb) {
  let settled = false
  const chunks = []
  let total = 0

  function finish(err, body) {
    if (settled) return
    settled = true
    cb(err, body)
  }

  req.on('data', (chunk) => {
    if (settled) return
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buf.length
    if (total > maxBytes) {
      finish(new Error('PAYLOAD_TOO_LARGE'))
      req.destroy()
      return
    }
    chunks.push(buf)
  })
  req.on('end', () => {
    if (settled) return
    try {
      const raw = Buffer.concat(chunks).toString('utf8')
      const parsed = JSON.parse(raw || '{}')
      finish(null, parsed)
    } catch (e) {
      finish(new Error('Invalid JSON body'))
    }
  })
  req.on('error', (e) => finish(e))
}

function handleQaExhaustive(body, res) {
  try {
    const nodes = body?.nodes ?? {}
    const items = body?.items ?? {}
    const enemies = body?.enemies ?? {}
    const encounters = body?.encounters ?? {}
    const profile = getQaProfile('local-full')
    const result = runStructuralQa(nodes, items, enemies, encounters)
    const markdown = formatQaReportMarkdown(result, { maxChars: 500_000, nodes })
    const mergedOutcome = evaluateStructuralQaOutcome(result, profile)
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        result,
        markdown,
        qaEnvelope: {
          version: QA_REPORT_ENVELOPE_VERSION,
          profileId: 'authoring-in-memory',
          mergedOutcome,
        },
      }),
    )
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message }))
  }
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
    const { diagnostics: graphDiagnostics } = analyzeGraph(nodes, encounters, getReleaseGraphAnalyzeOptions())
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
  const { diagnostics: graphDiagnostics } = analyzeGraph(nodes, encounters, getReleaseGraphAnalyzeOptions())
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
        written: written.map((p) => path.basename(p)),
        backups: backups.map((p) => path.basename(p)),
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
    res.end(JSON.stringify({ success: true, file: draftFileName, savedAt: payload.savedAt }))
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

function handleExportPackage(res, csvDir) {
  try {
    const model = buildCurrentModelFromCsv(csvDir)
    const manifest = {
      storyId: 'default',
      version: `v${Date.now()}`,
      title: 'Exported Story',
      author: 'local-author',
      description: 'Exported from authoring tool',
      createdAt: new Date().toISOString(),
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ manifest, model, assets: [] }))
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message }))
  }
}

function handleImportPackage(body, res, csvDir) {
  try {
    const manifest = body?.manifest
    const model = body?.model ?? {}
    const commit = body?.commit === true
    const assets = body?.assets ?? []

    if (!isValidPackageManifest(manifest)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Invalid package manifest' }))
      return
    }

    const assetDiagnostics = validateAssets(assets)
    const sanitizedModel = sanitizeModelTextFields(model)
    const { errors, warnings } = validateData(
      sanitizedModel.nodes ?? {},
      sanitizedModel.items ?? {},
      sanitizedModel.enemies ?? {},
      sanitizedModel.encounters ?? {},
    )
    const diagnostics = [...assetDiagnostics, ...errors, ...warnings]
    const hasErrors = diagnostics.some((d) => d.severity === 'error')

    if (hasErrors || !commit) {
      const failureReasons = diagnostics.filter((d) => d.severity === 'error').map((d) => d.message || d.code)
      if (failureReasons.length > 0 && typeof console !== 'undefined' && console.warn) {
        console.warn('[phase5] package import not committed:', failureReasons.join('; '))
      }
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          success: !hasErrors && !commit,
          committed: false,
          diagnostics,
          manifest,
        }),
      )
      return
    }

    writeFileInDir(csvDir, 'nodes.csv', serializeNodesToCsv(sanitizedModel.nodes ?? {}))
    writeFileInDir(csvDir, 'items.csv', serializeItemsToCsv(sanitizedModel.items ?? {}))
    writeFileInDir(csvDir, 'enemies.csv', serializeEnemiesToCsv(sanitizedModel.enemies ?? {}))
    writeFileInDir(csvDir, 'encounters.csv', serializeEncountersToCsv(sanitizedModel.encounters ?? {}))

    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        success: true,
        committed: true,
        diagnostics,
        manifest,
      }),
    )
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message }))
  }
}
