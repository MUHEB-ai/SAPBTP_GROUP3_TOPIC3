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

// Carrier Reliability Tiers — composite score (50/30/20) + quartile (NTILE) tiers
run('MCarrierClassification', `
  DELETE FROM flightaudit_MCarrierClassification;
  INSERT INTO flightaudit_MCarrierClassification
  WITH per_carrier AS (
    SELECT
      MarketingAirline AS Airline,
      count(*) AS TotalFlights,
      round((count(*) - sum(Cancelled) - sum(Diverted) - sum(ArrDel15)) * 100.0
            / nullif(count(*) - sum(Cancelled) - sum(Diverted), 0), 1) AS OnTimePct,
      round(sum(Cancelled) * 100.0 / nullif(count(*), 0), 1) AS CancellationPct,
      round(sum(ArrDelayMinutes) * 1.0 / nullif(count(*) - sum(Cancelled), 0), 1) AS AvgArrDelay
    FROM ${SRC}
    GROUP BY MarketingAirline
  ),
  bounds AS (
    SELECT MIN(OnTimePct) mnO, MAX(OnTimePct) mxO,
           MIN(CancellationPct) mnC, MAX(CancellationPct) mxC,
           MIN(AvgArrDelay) mnD, MAX(AvgArrDelay) mxD
    FROM per_carrier
  ),
  scored AS (
    SELECT p.Airline, p.TotalFlights, p.OnTimePct, p.CancellationPct, p.AvgArrDelay,
      round(
          0.5 * (CASE WHEN mxO=mnO THEN 100 ELSE (p.OnTimePct-mnO)*100.0/(mxO-mnO) END)
        + 0.3 * (CASE WHEN mxC=mnC THEN 100 ELSE (mxC-p.CancellationPct)*100.0/(mxC-mnC) END)
        + 0.2 * (CASE WHEN mxD=mnD THEN 100 ELSE (mxD-p.AvgArrDelay)*100.0/(mxD-mnD) END)
      ,1) AS Score
    FROM per_carrier p, bounds
  ),
  ranked AS (
    SELECT *, NTILE(4) OVER (ORDER BY Score DESC) AS q FROM scored
  )
  SELECT
    Airline, TotalFlights, OnTimePct, CancellationPct, AvgArrDelay, Score,
    CASE q WHEN 1 THEN 'Excellent' WHEN 2 THEN 'Good' WHEN 3 THEN 'Fair' ELSE 'Poor' END AS ReliabilityTier,
    CASE q WHEN 1 THEN 3 WHEN 2 THEN 2 WHEN 3 THEN 2 ELSE 1 END AS TierCriticality
  FROM ranked;
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
    SELECT 'Cancelled', 6, count(*), NULL, 1
    FROM ${SRC} WHERE Cancelled = 1
  )
  SELECT Category, FlightCount,
         round(FlightCount * 100.0 / nullif((SELECT cnt FROM total), 0), 1) AS Percentage,
         AvgDelay, Criticality
  FROM cats ORDER BY SortKey;
`);

// ===== TASK 3: Association / Root-Cause Analysis =====

// Delay cause contribution by time-of-day block
run('MDelayCauseByTime', `
  DELETE FROM flightaudit_MDelayCauseByTime;
  INSERT INTO flightaudit_MDelayCauseByTime
  SELECT
    substr(DepTimeBlk, 1, 2) AS TimeBlock,
    round(sum(CarrierDelay), 0)      AS CarrierMin,
    round(sum(WeatherDelay), 0)      AS WeatherMin,
    round(sum(NASDelay), 0)          AS NASMin,
    round(sum(LateAircraftDelay), 0) AS LateAircraftMin,
    round(sum(SecurityDelay), 0)     AS SecurityMin
  FROM ${SRC}
  WHERE Cancelled = 0 AND DepTimeBlk IS NOT NULL AND DepTimeBlk <> ''
  GROUP BY substr(DepTimeBlk, 1, 2)
  ORDER BY TimeBlock;
`);

// Delay cause contribution by month
run('MDelayCauseByMonth', `
  DELETE FROM flightaudit_MDelayCauseByMonth;
  INSERT INTO flightaudit_MDelayCauseByMonth
  SELECT
    Month,
    round(sum(CarrierDelay), 0)      AS CarrierMin,
    round(sum(WeatherDelay), 0)      AS WeatherMin,
    round(sum(NASDelay), 0)          AS NASMin,
    round(sum(LateAircraftDelay), 0) AS LateAircraftMin,
    round(sum(SecurityDelay), 0)     AS SecurityMin
  FROM ${SRC}
  WHERE Cancelled = 0
  GROUP BY Month
  ORDER BY Month;
`);

// Delay behavior by scheduled-duration band
run('MDelayByDuration', `
  DELETE FROM flightaudit_MDelayByDuration;
  INSERT INTO flightaudit_MDelayByDuration
  WITH banded AS (
    SELECT
      CASE
        WHEN CRSElapsedTime < 120 THEN 'Short (<2h)'
        WHEN CRSElapsedTime < 240 THEN 'Medium (2-4h)'
        ELSE 'Long (>4h)'
      END AS DurationBand,
      CASE
        WHEN CRSElapsedTime < 120 THEN 1
        WHEN CRSElapsedTime < 240 THEN 2
        ELSE 3
      END AS SortKey,
      ArrDelayMinutes, ArrDel15
    FROM ${SRC}
    WHERE Cancelled = 0 AND CRSElapsedTime IS NOT NULL
  )
  SELECT
    DurationBand,
    count(*) AS FlightCount,
    round(avg(ArrDelayMinutes), 1) AS AvgArrDelay,
    round(sum(ArrDel15) * 100.0 / nullif(count(*), 0), 1) AS DelayedPct
  FROM banded
  GROUP BY DurationBand, SortKey
  ORDER BY SortKey;
`);

['MAirlineKPIs','MMonthlyKPIs','MWeekdayKPIs','MBrandVsOperator',
 'MCarrierClassification','MFlightDelayClassification','MDelayCauseByTime','MDelayCauseByMonth','MDelayByDuration'].forEach(t => {
  const n = db.prepare(`SELECT count(*) c FROM flightaudit_${t}`).get().c;
  console.log(`  ${t}: ${n} Zeilen`);
});
db.close();
console.log('Fertig.');