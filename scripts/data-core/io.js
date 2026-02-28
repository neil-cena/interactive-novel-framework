/**
 * Node-only I/O: filesystem and path. Must NOT be imported by browser/authoring code.
 * Only scripts (build-data, lint-data, dev-data, authoring server plugin) may import this.
 */

import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'

/**
 * Read and parse a CSV file. Throws on parse errors or missing file.
 *
 * @param {string} csvDir - Absolute path to directory containing CSV files
 * @param {string} fileName - File name (e.g. 'nodes.csv')
 * @returns {Array<Record<string, string>>} Array of row objects (header keys, trimmed values)
 */
export function readCsv(csvDir, fileName) {
  const filePath = path.join(csvDir, fileName)
  const csvText = fs.readFileSync(filePath, 'utf8')
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => (value != null ? String(value).trim() : ''),
  })

  if (parsed.errors.length > 0) {
    const message = parsed.errors.map((err) => `${fileName}: ${err.message}`).join('\n')
    throw new Error(`CSV parse errors:\n${message}`)
  }

  return parsed.data
}

/**
 * Write a UTF-8 text file under dataDir. Overwrites if exists.
 *
 * @param {string} dataDir - Absolute path to output directory (e.g. src/data)
 * @param {string} fileName - File name (e.g. 'nodes.ts')
 * @param {string} content - Full file content
 */
export function writeDataFile(dataDir, fileName, content) {
  const outputPath = path.join(dataDir, fileName)
  fs.writeFileSync(outputPath, content, 'utf8')
}

/**
 * Read raw file content (for backup). Node-only.
 * @param {string} dir - Absolute path to directory
 * @param {string} fileName - File name
 * @returns {string}
 */
export function readRawFile(dir, fileName) {
  const filePath = path.join(dir, fileName)
  return fs.readFileSync(filePath, 'utf8')
}

/**
 * Write a UTF-8 file under dir. Used for CSV writes and backups. Node-only.
 * @param {string} dir - Absolute path to directory
 * @param {string} fileName - File name (e.g. 'nodes.csv' or 'nodes.csv.bak.123')
 * @param {string} content - Full file content
 */
export function writeFileInDir(dir, fileName, content) {
  const outputPath = path.join(dir, fileName)
  fs.writeFileSync(outputPath, content, 'utf8')
}
