// export-kpis.js
// Reads the six materialized KPI tables from db/flights.sqlite and writes
// small CDS-deployable CSVs into db/data/.
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH  = path.join(__dirname, 'db', 'flights.sqlite');
const OUT_DIR  = path.join(__dirname, 'db', 'data');

const EXPORTS = {
  'flightaudit-MAirlineKPIs': {
    table: 'flightaudit_MAirlineKPIs',
    cols: ['Airline','TotalFlights','CancelledFlights','DivertedFlights','DelayedArrivals','OnTimePct','CancellationPct','AvgArrDelay'],
  },
  'flightaudit-MMonthlyKPIs': {
    table: 'flightaudit_MMonthlyKPIs',
    cols: ['Month','TotalFlights','CancelledFlights','DelayedArrivals','OnTimePct','CancellationPct','AvgArrDelay'],
  },
  'flightaudit-MWeekdayKPIs': {
    table: 'flightaudit_MWeekdayKPIs',
    cols: ['DayOfWeek','TotalFlights','CancelledFlights','DelayedArrivals','OnTimePct','AvgArrDelay'],
  },
  'flightaudit-MBrandVsOperator': {
    table: 'flightaudit_MBrandVsOperator',
    cols: ['Brand','Operator','TotalFlights','DelayedArrivals','OnTimePct','AvgArrDelay'],
  },
  'flightaudit-MCarrierClassification': {
    table: 'flightaudit_MCarrierClassification',
    cols: ['Airline','TotalFlights','OnTimePct','CancellationPct','AvgArrDelay','ReliabilityTier','TierCriticality'],
  },
  'flightaudit-MFlightDelayClassification': {
    table: 'flightaudit_MFlightDelayClassification',
    cols: ['Category','FlightCount','Percentage','AvgDelay','Criticality'],
  },
};

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const db = new Database(DB_PATH, { readonly: true });
const actual = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name)
);
fs.mkdirSync(OUT_DIR, { recursive: true });

let ok = 0;
for (const [fileBase, { table, cols }] of Object.entries(EXPORTS)) {
  if (!actual.has(table)) {
    console.error(`MISSING TABLE: ${table}  -> skipping ${fileBase}.csv`);
    continue;
  }
  const rows = db.prepare(`SELECT ${cols.map(c => `"${c}"`).join(',')} FROM "${table}"`).all();
  const header = cols.join(',');
  const body = rows.map(r => cols.map(c => csvCell(r[c])).join(',')).join('\n');
  const out = header + '\n' + body + (body ? '\n' : '');
  fs.writeFileSync(path.join(OUT_DIR, fileBase + '.csv'), out, 'utf8');
  console.log(`wrote ${fileBase}.csv  (${rows.length} rows, ${out.length} bytes)`);
  ok++;
}
db.close();
console.log(`\n${ok}/6 KPI tables exported to db/data/`);