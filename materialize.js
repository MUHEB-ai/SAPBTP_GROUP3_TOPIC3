// materialize.js — berechnet KPI-Aggregate aus den Rohtabellen in kleine Tabellen
// Voraussetzung: db/flights.sqlite existiert mit gefüllten flightaudit_* Tabellen
// Ausführen:  node materialize.js
const Database = require('better-sqlite3');
const db = new Database('db/flights.sqlite');

const SRC = 'flightaudit_MarketingFlights';

function run(label, sql) {
  console.log(label + ' …');
  db.exec(sql);
}

// Airline
run('MAirlineKPIs', `
  DELETE FROM flightaudit_MAirlineKPIs;
  INSERT INTO flightaudit_MAirlineKPIs
  SELECT MarketingAirline AS Airline,
         count(*), sum(Cancelled), sum(Diverted), sum(ArrDel15),
         round((count(*)-sum(Cancelled)-sum(Diverted)-sum(ArrDel15))*100.0
               / nullif(count(*)-sum(Cancelled)-sum(Diverted),0), 1),
         round(sum(Cancelled)*100.0/nullif(count(*),0), 1),
         round(sum(ArrDelayMinutes)*1.0/nullif(count(*)-sum(Cancelled),0), 1)
  FROM ${SRC} GROUP BY MarketingAirline;
`);

// Monat
run('MMonthlyKPIs', `
  DELETE FROM flightaudit_MMonthlyKPIs;
  INSERT INTO flightaudit_MMonthlyKPIs
  SELECT Month,
         count(*), sum(Cancelled), sum(ArrDel15),
         round((count(*)-sum(Cancelled)-sum(ArrDel15))*100.0
               / nullif(count(*)-sum(Cancelled),0), 1),
         round(sum(Cancelled)*100.0/nullif(count(*),0), 1),
         round(sum(ArrDelayMinutes)*1.0/nullif(count(*)-sum(Cancelled),0), 1)
  FROM ${SRC} GROUP BY Month;
`);

// Wochentag
run('MWeekdayKPIs', `
  DELETE FROM flightaudit_MWeekdayKPIs;
  INSERT INTO flightaudit_MWeekdayKPIs
  SELECT DayOfWeek,
         count(*), sum(Cancelled), sum(ArrDel15),
         round((count(*)-sum(Cancelled)-sum(ArrDel15))*100.0
               / nullif(count(*)-sum(Cancelled),0), 1),
         round(sum(ArrDelayMinutes)*1.0/nullif(count(*)-sum(Cancelled),0), 1)
  FROM ${SRC} GROUP BY DayOfWeek;
`);

// Brand vs Operator (nur Kombinationen mit >= 100 Flügen, um Rauschen zu filtern)
run('MBrandVsOperator', `
  DELETE FROM flightaudit_MBrandVsOperator;
  INSERT INTO flightaudit_MBrandVsOperator
  SELECT MarketingAirline, OperatingAirline,
         count(*), sum(ArrDel15),
         round((count(*)-sum(ArrDel15))*100.0/nullif(count(*),0), 1),
         round(sum(ArrDelayMinutes)*1.0/nullif(count(*),0), 1)
  FROM ${SRC} GROUP BY MarketingAirline, OperatingAirline HAVING count(*) >= 100;
`);

['MAirlineKPIs','MMonthlyKPIs','MWeekdayKPIs','MBrandVsOperator'].forEach(t => {
  const n = db.prepare(`SELECT count(*) c FROM flightaudit_${t}`).get().c;
  console.log(`  ${t}: ${n} Zeilen`);
});
db.close();
console.log('Fertig.');