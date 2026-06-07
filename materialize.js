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

// ===== Task 2: Classification =====

// Carrier Reliability Tiers
run('MCarrierClassification', `
  DELETE FROM flightaudit_MCarrierClassification;
  INSERT INTO flightaudit_MCarrierClassification
  SELECT
    MarketingAirline AS Airline,
    count(*) AS TotalFlights,
    round((count(*) - sum(Cancelled) - sum(Diverted) - sum(ArrDel15)) * 100.0
          / nullif(count(*) - sum(Cancelled) - sum(Diverted), 0), 1) AS OnTimePct,
    round(sum(Cancelled) * 100.0 / nullif(count(*), 0), 1) AS CancellationPct,
    round(sum(ArrDelayMinutes) * 1.0 / nullif(count(*) - sum(Cancelled), 0), 1) AS AvgArrDelay,
    CASE
      WHEN round((count(*) - sum(Cancelled) - sum(Diverted) - sum(ArrDel15)) * 100.0
           / nullif(count(*) - sum(Cancelled) - sum(Diverted), 0), 1) >= 85
           AND sum(Cancelled) * 100.0 / count(*) < 1 THEN 'Excellent'
      WHEN round((count(*) - sum(Cancelled) - sum(Diverted) - sum(ArrDel15)) * 100.0
           / nullif(count(*) - sum(Cancelled) - sum(Diverted), 0), 1) >= 70
           AND sum(Cancelled) * 100.0 / count(*) < 3 THEN 'Good'
      WHEN round((count(*) - sum(Cancelled) - sum(Diverted) - sum(ArrDel15)) * 100.0
           / nullif(count(*) - sum(Cancelled) - sum(Diverted), 0), 1) >= 50 THEN 'AtRisk'
      ELSE 'Poor'
    END AS ReliabilityTier,
    CASE
      WHEN round((count(*) - sum(Cancelled) - sum(Diverted) - sum(ArrDel15)) * 100.0
           / nullif(count(*) - sum(Cancelled) - sum(Diverted), 0), 1) >= 85
           AND sum(Cancelled) * 100.0 / count(*) < 1 THEN 3
      WHEN round((count(*) - sum(Cancelled) - sum(Diverted) - sum(ArrDel15)) * 100.0
           / nullif(count(*) - sum(Cancelled) - sum(Diverted), 0), 1) >= 70
           AND sum(Cancelled) * 100.0 / count(*) < 3 THEN 2
      WHEN round((count(*) - sum(Cancelled) - sum(Diverted) - sum(ArrDel15)) * 100.0
           / nullif(count(*) - sum(Cancelled) - sum(Diverted), 0), 1) >= 50 THEN 1
      ELSE 1
    END AS TierCriticality
  FROM ${SRC}
  GROUP BY MarketingAirline;
`);

// Flight Delay Severity Distribution
run('MFlightDelayClassification', `
  DELETE FROM flightaudit_MFlightDelayClassification;
  INSERT INTO flightaudit_MFlightDelayClassification
  WITH total AS (SELECT count(*) AS cnt FROM ${SRC} WHERE Cancelled = 0),
  cats AS (
    SELECT 'OnTime' AS Category, 1 AS SortKey,
           count(*) AS FlightCount,
           round(avg(ArrDelayMinutes), 1) AS AvgDelay, 3 AS Criticality
    FROM ${SRC} WHERE Cancelled = 0 AND ArrDelayMinutes <= 0
    UNION ALL
    SELECT 'Minor', 2, count(*), round(avg(ArrDelayMinutes), 1), 2
    FROM ${SRC} WHERE Cancelled = 0 AND ArrDelayMinutes > 0 AND ArrDelayMinutes <= 15
    UNION ALL
    SELECT 'Moderate', 3, count(*), round(avg(ArrDelayMinutes), 1), 2
    FROM ${SRC} WHERE Cancelled = 0 AND ArrDelayMinutes > 15 AND ArrDelayMinutes <= 45
    UNION ALL
    SELECT 'Severe', 4, count(*), round(avg(ArrDelayMinutes), 1), 1
    FROM ${SRC} WHERE Cancelled = 0 AND ArrDelayMinutes > 45 AND ArrDelayMinutes <= 120
    UNION ALL
    SELECT 'Critical', 5, count(*), round(avg(ArrDelayMinutes), 1), 1
    FROM ${SRC} WHERE Cancelled = 0 AND ArrDelayMinutes > 120
    UNION ALL
    SELECT 'Cancelled', 6, count(*), 0, 1
    FROM ${SRC} WHERE Cancelled = 1
  )
  SELECT Category, FlightCount,
         round(FlightCount * 100.0 / nullif((SELECT cnt FROM total), 0), 1) AS Percentage,
         AvgDelay, Criticality
  FROM cats ORDER BY SortKey;
`);

['MAirlineKPIs','MMonthlyKPIs','MWeekdayKPIs','MBrandVsOperator',
 'MCarrierClassification','MFlightDelayClassification'].forEach(t => {
  const n = db.prepare(`SELECT count(*) c FROM flightaudit_${t}`).get().c;
  console.log(`  ${t}: ${n} Zeilen`);
});
db.close();
console.log('Fertig.');