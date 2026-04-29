/**
 * MVPL Excel Adapter v2.1
 * API-connected — https://mvpl.hanabokur0.workers.dev/verify
 *
 * Usage:
 *   node adapter.js --input data.xlsx --reference ref.xlsx [--output result.xlsx] [--config config.json]
 *
 * Config JSON:
 *   {
 *     "critical_fields": ["vendor_code", "amount"]
 *   }
 */

const XLSX  = require('xlsx');
const fetch = require('node-fetch');
const fs    = require('fs');

const API_URL = 'https://mvpl.hanabokur0.workers.dev/verify';

// Verdict values returned by the API
const VERDICTS = {
  AUTO_EXECUTE: 'AUTO_EXECUTE',
  HUMAN_REVIEW: 'HUMAN_REVIEW',
  STOP:         'STOP',
  UNKNOWN:      'UNKNOWN'
};

function readExcel(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function writeExcel(filePath, rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  XLSX.writeFile(wb, filePath);
  console.log(`\n✓ Output written to: ${filePath}`);
}

function loadConfig(configPath) {
  if (!configPath || !fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.warn('Config parse error, using defaults:', e.message);
    return {};
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      result[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return result;
}

async function callVerify(recordA, recordB, criticalFields = []) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ a: recordA, b: recordB, critical_fields: criticalFields })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}

async function run() {
  const args = parseArgs();

  if (!args.input || !args.reference) {
    console.log(`
MVPL Excel Adapter v2.1
------------------------
Usage:
  node adapter.js --input <data.xlsx> --reference <ref.xlsx> [--output <result.xlsx>] [--config <config.json>]

Verdict values (from API):
  AUTO_EXECUTE  全フィールド一致
  HUMAN_REVIEW  70%以上一致
  STOP          criticalフィールド不一致
  UNKNOWN       一致率低
    `);
    process.exit(0);
  }

  const inputRecords   = readExcel(args.input);
  const refRecords     = readExcel(args.reference);
  const config         = loadConfig(args.config);
  const outputPath     = args.output || 'result.xlsx';
  const criticalFields = config.critical_fields || [];

  const isSingleRef = refRecords.length === 1;
  const singleRef   = isSingleRef ? refRecords[0] : null;

  console.log(`\nMVPL Excel Adapter v2.1`);
  console.log(`───────────────────────`);
  console.log(`API          : ${API_URL}`);
  console.log(`Input        : ${inputRecords.length} records`);
  console.log(`Reference    : ${isSingleRef ? '1 (applied to all)' : refRecords.length + ' (1-to-1 paired)'}`);
  console.log(`Fields       : ${Object.keys(inputRecords[0]).join(', ')}`);
  if (criticalFields.length > 0) {
    console.log(`Critical     : ${criticalFields.join(', ')}`);
  }
  console.log(`\nProcessing...`);

  const results = [];
  const summary = {
    AUTO_EXECUTE: 0,
    HUMAN_REVIEW: 0,
    STOP:         0,
    UNKNOWN:      0,
    ERROR:        0
  };

  for (let i = 0; i < inputRecords.length; i++) {
    const record    = inputRecords[i];
    const reference = singleRef || refRecords[i];

    if (!reference) {
      results.push({ ...record, SCORE: '-', MATCH_RATE: '-', VERDICT: 'NO_REFERENCE' });
      summary.ERROR++;
      continue;
    }

    try {
      const api = await callVerify(record, reference, criticalFields);

      // Field-level match columns
      const fieldCols = {};
      if (api.results) {
        for (const [field, matched] of Object.entries(api.results)) {
          fieldCols[`${field}_match`] = matched ? '✓' : '✗';
        }
      }

      const matchRate = api.total_fields > 0
        ? Math.round((api.score / api.total_fields) * 100) + '%'
        : '-';

      results.push({
        ...record,
        ...fieldCols,
        SCORE:             `${api.score}/${api.total_fields}`,
        MATCH_RATE:        matchRate,
        CRITICAL_MISMATCH: api.critical_mismatch ? 'YES' : 'no',
        VERDICT:           api.verdict
      });

      summary[api.verdict] = (summary[api.verdict] || 0) + 1;
      process.stdout.write(`  [${i + 1}/${inputRecords.length}] ${api.verdict}\n`);

    } catch (err) {
      results.push({ ...record, SCORE: '-', MATCH_RATE: '-', VERDICT: 'ERROR', ERROR: err.message });
      summary.ERROR++;
      console.error(`  [${i + 1}] ERROR: ${err.message}`);
    }
  }

  console.log(`\nSummary:`);
  console.log(`  AUTO_EXECUTE : ${summary.AUTO_EXECUTE}`);
  console.log(`  HUMAN_REVIEW : ${summary.HUMAN_REVIEW}`);
  console.log(`  STOP         : ${summary.STOP}`);
  console.log(`  UNKNOWN      : ${summary.UNKNOWN}`);
  if (summary.ERROR > 0) console.log(`  ERROR        : ${summary.ERROR}`);

  writeExcel(outputPath, results);
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
