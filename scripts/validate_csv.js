const fs = require('fs');
const content = fs.readFileSync('data/csv/red_exchange_nodes.csv', 'utf8');

function parseCSV(text) {
  const rows = [];
  let i = 0;
  while (i < text.length) {
    const row = [];
    while (i < text.length) {
      if (text[i] === '"') {
        i++;
        let field = '';
        while (i < text.length) {
          if (text[i] === '"') {
            if (i + 1 < text.length && text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        row.push(field);
      } else {
        let field = '';
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i];
          i++;
        }
        row.push(field);
      }
      if (i < text.length && text[i] === ',') {
        i++;
      } else {
        break;
      }
    }
    while (i < text.length && (text[i] === '\n' || text[i] === '\r')) i++;
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      rows.push(row);
    }
  }
  return rows;
}

const rows = parseCSV(content);
console.log('Total rows:', rows.length);
console.log('');

const expectedNodes = [
  'ash_proposition', 'red_target', 'red_plan_detail', 'ash_backstory',
  'red_gather_intel', 'red_staging', 'red_pumping', 'red_distribution',
  'red_hesitation_1', 'red_staging_done', 'red_pumping_done', 'red_distribution_done',
  'red_commitment_junction', 'red_partial_retreat', 'red_final_operation',
  'red_aftermath_clean', 'red_aftermath_seawall', 'red_consequences', 'ending_red'
];

let errors = 0;
rows.forEach((row, idx) => {
  const id = row[0];
  const type = row[1];
  const numFields = row.length;
  const textLen = row[2] ? row[2].length : 0;
  let choices = 0;
  for (let c = 0; c < 6; c++) {
    const base = 5 + c * 5;
    if (base < row.length && row[base] && row[base].trim()) choices++;
  }
  const ok = numFields === 35;
  if (!ok) errors++;
  console.log(`${idx+1}. ${id} [${type}] text=${textLen}ch choices=${choices} fields=${numFields} ${ok ? 'OK' : 'ERROR: expected 35 fields'}`);

  // Validate choice mechanics
  for (let c = 0; c < 6; c++) {
    const cId = 5 + c * 5;
    const cLabel = 6 + c * 5;
    const cMech = 8 + c * 5;
    if (cId < row.length && row[cId] && row[cId].trim()) {
      if (!row[cMech] || !row[cMech].startsWith('navigate:')) {
        console.log(`   WARNING: choice${c+1} (${row[cId]}) mechanic missing or invalid: "${row[cMech]}"`);
        errors++;
      }
    }
  }
});

// Check expected nodes
const foundIds = rows.map(r => r[0]);
expectedNodes.forEach(n => {
  if (!foundIds.includes(n)) {
    console.log(`MISSING NODE: ${n}`);
    errors++;
  }
});

console.log(`\n${errors === 0 ? 'ALL CHECKS PASSED' : errors + ' error(s) found'}`);
