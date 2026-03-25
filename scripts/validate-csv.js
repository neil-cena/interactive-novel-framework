const fs = require('fs')
const content = fs.readFileSync('data/csv/night_nodes.csv', 'utf-8')

function countFields(row) {
  let count = 1
  let inQuotes = false
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '"') {
      if (inQuotes && row[i + 1] === '"') { i++; continue }
      inQuotes = !inQuotes
    } else if (row[i] === ',' && !inQuotes) {
      count++
    }
  }
  return count
}

let rows = []
let current = ''
let inQuotes = false
for (const line of content.split('\n')) {
  current += (current ? '\n' : '') + line
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes
  }
  if (!inQuotes) {
    if (current.trim()) rows.push(current)
    current = ''
  }
}
if (current.trim()) rows.push(current)

console.log('Total logical rows: ' + rows.length)
let errors = 0
for (const row of rows) {
  const fields = countFields(row)
  const id = row.split(',')[0]
  if (fields !== 36) {
    console.log('ERROR: ' + id + ' has ' + fields + ' fields, expected 36')
    errors++
  } else {
    console.log('OK: ' + id)
  }
}
if (errors === 0) console.log('\nAll rows valid.')
else console.log('\n' + errors + ' rows with errors.')
