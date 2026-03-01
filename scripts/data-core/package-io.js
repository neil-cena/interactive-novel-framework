/**
 * Story package I/O and binary safety checks.
 */

import { readCsv } from './io.js'
import { parseNodes, parseItems, parseEnemies, parseEncounters } from './parse.js'

const MAX_ASSET_BYTES = 5 * 1024 * 1024

function decodeBase64(base64) {
  return Buffer.from(base64, 'base64')
}

function hasKnownSignature(buffer) {
  if (buffer.length < 12) return false
  const hex = buffer.subarray(0, 12).toString('hex')
  // PNG
  if (hex.startsWith('89504e470d0a1a0a')) return true
  // JPG
  if (hex.startsWith('ffd8ff')) return true
  // GIF
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF89a' || buffer.subarray(0, 6).toString('ascii') === 'GIF87a') return true
  // WEBP (RIFF....WEBP)
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return true
  // OGG
  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') return true
  // WAV (RIFF....WAVE)
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE') return true
  // MP3 (ID3 or frame sync)
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3') return true
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return true
  return false
}

export function validateAssets(assets = []) {
  const diagnostics = []
  for (const asset of assets) {
    if (!asset || typeof asset.name !== 'string' || typeof asset.base64 !== 'string') {
      diagnostics.push({ severity: 'error', code: 'asset_shape', message: 'Invalid asset payload shape' })
      continue
    }
    const bytes = decodeBase64(asset.base64)
    if (bytes.length > MAX_ASSET_BYTES) {
      diagnostics.push({ severity: 'error', code: 'asset_too_large', message: `Asset too large: ${asset.name}` })
      continue
    }
    if (!hasKnownSignature(bytes)) {
      diagnostics.push({ severity: 'error', code: 'asset_signature', message: `Unsupported or unsafe asset type: ${asset.name}` })
    }
  }
  return diagnostics
}

export function buildCurrentModelFromCsv(csvDir) {
  const nodesRows = readCsv(csvDir, 'nodes.csv')
  const itemsRows = readCsv(csvDir, 'items.csv')
  const enemiesRows = readCsv(csvDir, 'enemies.csv')
  const encountersRows = readCsv(csvDir, 'encounters.csv')
  return {
    nodes: parseNodes(nodesRows),
    items: parseItems(itemsRows),
    enemies: parseEnemies(enemiesRows),
    encounters: parseEncounters(encountersRows),
  }
}
