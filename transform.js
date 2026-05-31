// transform.js — Ausführen:  node transform.js
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

const RAW = './data-raw';
const OUT = './db/data';
fs.mkdirSync(OUT, { recursive: true });

const num = v => { const s = (v ?? '').toString().trim(); if (s === '') return ''; const n = Number(s); return Number.isFinite(n) ? String(n) : ''; };
const str = v => (v ?? '').toString().trim();

const MARKETING_COLS = ['ID','FlightDate','Year','Month','DayOfWeek','MarketingAirline','OperatingAirline','CodeShare','TailNumber','FlightNum','Origin','OriginCity','OriginState','Dest','DestCity','DestState','DepDelay','DepDelayMinutes','DepDel15','DepTimeBlk','ArrDelay','ArrDelayMinutes','ArrDel15','ArrTimeBlk','Cancelled','CancellationCode','Diverted','CRSElapsedTime','ActualElapsedTime','AirTime','Distance','CarrierDelay','WeatherDelay','NASDelay','SecurityDelay','LateAircraftDelay'];
const REPORTING_COLS = ['ID','FlightDate','Year','Month','DayOfWeek','ReportingAirline','TailNumber','FlightNum','Origin','OriginCity','OriginState','Dest','DestCity','DestState','DepDelay','DepDelayMinutes','DepDel15','DepTimeBlk','ArrDelay','ArrDelayMinutes','ArrDel15','ArrTimeBlk','Cancelled','CancellationCode','Diverted','CRSElapsedTime','ActualElapsedTime','AirTime','Distance','CarrierDelay','WeatherDelay','NASDelay','SecurityDelay','LateAircraftDelay'];

const mapMarketing = (r, id) => [
  id, str(r.FlightDate), num(r.Year), num(r.Month), num(r.DayOfWeek),
  str(r.Marketing_Airline_Network), str(r.Operating_Airline), str(r.Operated_or_Branded_Code_Share_Partners),
  str(r.Tail_Number), str(r.Flight_Number_Marketing_Airline),
  str(r.Origin), str(r.OriginCityName), str(r.OriginState),
  str(r.Dest), str(r.DestCityName), str(r.DestState),
  num(r.DepDelay), num(r.DepDelayMinutes), num(r.DepDel15), str(r.DepTimeBlk),
  num(r.ArrDelay), num(r.ArrDelayMinutes), num(r.ArrDel15), str(r.ArrTimeBlk),
  num(r.Cancelled), str(r.CancellationCode), num(r.Diverted),
  num(r.CRSElapsedTime), num(r.ActualElapsedTime), num(r.AirTime), num(r.Distance),
  num(r.CarrierDelay), num(r.WeatherDelay), num(r.NASDelay), num(r.SecurityDelay), num(r.LateAircraftDelay)
];

const mapReporting = (r, id) => [
  id, str(r.FlightDate), num(r.Year), num(r.Month), num(r.DayOfWeek),
  str(r.Reporting_Airline),
  str(r.Tail_Number), str(r.Flight_Number_Reporting_Airline),
  str(r.Origin), str(r.OriginCityName), str(r.OriginState),
  str(r.Dest), str(r.DestCityName), str(r.DestState),
  num(r.DepDelay), num(r.DepDelayMinutes), num(r.DepDel15), str(r.DepTimeBlk),
  num(r.ArrDelay), num(r.ArrDelayMinutes), num(r.ArrDel15), str(r.ArrTimeBlk),
  num(r.Cancelled), str(r.CancellationCode), num(r.Diverted),
  num(r.CRSElapsedTime), num(r.ActualElapsedTime), num(r.AirTime), num(r.Distance),
  num(r.CarrierDelay), num(r.WeatherDelay), num(r.NASDelay), num(r.SecurityDelay), num(r.LateAircraftDelay)
];

function processTable(subdir, outFile, header, mapFn) {
  return new Promise((resolve, reject) => {
    const dir = path.join(RAW, subdir);
    if (!fs.existsSync(dir)) return reject(new Error('Ordner fehlt: ' + dir));
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.csv')).sort();
    if (!files.length) return reject(new Error('Keine CSV in ' + dir));

    const out = stringify({ header: true, columns: header });
    const ws = fs.createWriteStream(path.join(OUT, outFile));
    out.pipe(ws);
    let id = 0, total = 0;

    (async () => {
      for (const f of files) {
        await new Promise((res, rej) => {
          const parser = parse({ columns: h => h.map(x => x.trim()), relax_column_count: true, skip_empty_lines: true });
          let count = 0;
          fs.createReadStream(path.join(dir, f)).pipe(parser)
            .on('data', row => {
              id++; count++; total++;
              if (!out.write(mapFn(row, id))) { parser.pause(); out.once('drain', () => parser.resume()); }
            })
            .on('end', () => { console.log(`  ${f}: ${count} Zeilen`); res(); })
            .on('error', rej);
        });
      }
      out.end();
    })().catch(reject);

    ws.on('finish', () => { console.log(`✓ ${outFile}: ${total} Zeilen gesamt`); resolve(total); });
    ws.on('error', reject);
  });
}

(async () => {
  console.log('Marketing …');
  await processTable('marketing', 'flightaudit-MarketingFlights.csv', MARKETING_COLS, mapMarketing);
  console.log('Reporting …');
  await processTable('reporting', 'flightaudit-ReportingFlights.csv', REPORTING_COLS, mapReporting);
  console.log('Fertig.');
})().catch(e => { console.error(e); process.exit(1); });