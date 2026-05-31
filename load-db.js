// load-db.js — Streaming-Import der db/data CSVs direkt in SQLite
// Ausführen:  node load-db.js
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const Database = require('better-sqlite3');

const DB = 'db/flights.sqlite';
const DATA = 'db/data';

// 1. Erst Schema via cds deploy ohne Daten aufbauen — machen wir separat.
//    Hier gehen wir davon aus, dass die Tabellen existieren (leer).
const db = new Database(DB);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');   // schneller Import, ok für Dev

function importCsv(file, table, columns) {
  return new Promise((resolve, reject) => {
    const full = path.join(DATA, file);
    if (!fs.existsSync(full)) return reject(new Error('fehlt: ' + full));

    const placeholders = columns.map(() => '?').join(',');
    const insert = db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`);

    // vorhandene Zeilen löschen (idempotent)
    db.prepare(`DELETE FROM ${table}`).run();

    let count = 0;
    const tx = db.transaction((rows) => { for (const r of rows) insert.run(r); });
    let batch = [];

    const parser = parse({ columns: true, skip_empty_lines: true, relax_column_count: true });
    fs.createReadStream(full).pipe(parser)
      .on('data', row => {
        batch.push(columns.map(c => { const v = row[c]; return v === '' || v === undefined ? null : v; }));
        count++;
        if (batch.length >= 5000) { tx(batch); batch = []; }
      })
      .on('end', () => { if (batch.length) tx(batch); console.log(`  ${table}: ${count} Zeilen`); resolve(count); })
      .on('error', reject);
  });
}

const MARKETING_COLS = ['ID','FlightDate','Year','Month','DayOfWeek','MarketingAirline','OperatingAirline','CodeShare','TailNumber','FlightNum','Origin','OriginCity','OriginState','Dest','DestCity','DestState','DepDelay','DepDelayMinutes','DepDel15','DepTimeBlk','ArrDelay','ArrDelayMinutes','ArrDel15','ArrTimeBlk','Cancelled','CancellationCode','Diverted','CRSElapsedTime','ActualElapsedTime','AirTime','Distance','CarrierDelay','WeatherDelay','NASDelay','SecurityDelay','LateAircraftDelay'];
const REPORTING_COLS = ['ID','FlightDate','Year','Month','DayOfWeek','ReportingAirline','TailNumber','FlightNum','Origin','OriginCity','OriginState','Dest','DestCity','DestState','DepDelay','DepDelayMinutes','DepDel15','DepTimeBlk','ArrDelay','ArrDelayMinutes','ArrDel15','ArrTimeBlk','Cancelled','CancellationCode','Diverted','CRSElapsedTime','ActualElapsedTime','AirTime','Distance','CarrierDelay','WeatherDelay','NASDelay','SecurityDelay','LateAircraftDelay'];

(async () => {
  console.time('import');
  await importCsv('flightaudit-MarketingFlights.csv', 'flightaudit_MarketingFlights', MARKETING_COLS);
  await importCsv('flightaudit-ReportingFlights.csv', 'flightaudit_ReportingFlights', REPORTING_COLS);
  db.close();
  console.timeEnd('import');
  console.log('Fertig.');
})().catch(e => { console.error(e); process.exit(1); });