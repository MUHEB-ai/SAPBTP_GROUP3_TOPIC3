# Airline On-Time Performance Audit — SAP BTP

**Data Analysis on the SAP Business Technology Platform — Summer Semester 2026**
Saarland University · Group 3 · Topic 3

An AI-enhanced operational audit dashboard for U.S. domestic airline on-time
performance, built on SAP Cloud Application Programming Model (CAP) and SAP Fiori
Elements. This repository covers the data foundation and the Task 1 (Data
Visualization) deliverables; Tasks 2–4 build on the same backend.

---

## Tech Stack

- **Backend:** SAP CAP (Node.js / JavaScript)
- **Frontend:** SAP Fiori Elements (Analytical List Page)
- **API:** OData V4
- **Database (development):** SQLite
- **Data:** U.S. DOT / BTS On-Time Performance, 2025 (months 1–10)

---

## Repository Structure

```
.
├── app/                          # Fiori Elements dashboards
│   ├── airlinedashboard/         #   Task 1: KPIs per airline
│   ├── monthlytrend/             #   Task 1: On-time trend by month
│   ├── weekdaytrend/             #   Task 1: On-time trend by weekday
│   ├── brandoperator/            #   Task 1: Brand vs. operator comparison
│   ├── carrierclassification/    #   Task 2: Carrier reliability tiers
│   └── delayseverity/            #   Task 2: Flight delay severity distribution
├── db/
│   ├── schema.cds                # Data model: raw tables + KPI + classification tables
│   └── data/                     # Lean transformed CSVs (git-ignored)
├── srv/
│   └── flight-service.cds        # OData service + analytical annotations
├── transform.js                  # Stream-transforms raw DOT CSVs into the lean schema
├── load-db.js                    # Streaming import of the lean CSVs into SQLite
├── materialize.js                # Pre-computes KPI aggregates + classification tables
└── package.json
```

> **Not in the repository (git-ignored):** raw CSVs (`data-raw/`), the lean
> CSVs (`db/data/`), the SQLite database (`*.sqlite`) and `node_modules/`.
> The database is fully reproducible from the raw data via the pipeline below.

---

## Data Pipeline

The full-year dataset is ~12.3 million rows, which exceeds the limits of
`cds deploy` (Node string-length cap on a single CSV read). The pipeline below
works around this with a streaming loader and a pre-computed aggregation layer.

1. **`transform.js`** — reads the raw DOT CSVs (~110 columns each) from
   `data-raw/marketing/` and `data-raw/reporting/`, extracts the ~35 relevant
   columns, and writes lean CSVs to `db/data/`.
2. **`cds deploy`** (with the CSVs temporarily hidden) — creates the schema and
   views without loading data.
3. **`load-db.js`** — streams the lean CSVs row-by-row into SQLite using
   `better-sqlite3` (batched inserts, WAL mode), bypassing the `cds deploy`
   string-length limit.
4. **`materialize.js`** — computes the four KPI aggregate tables
   (`MAirlineKPIs`, `MMonthlyKPIs`, `MWeekdayKPIs`, `MBrandVsOperator`) from the
   raw tables via SQL `GROUP BY`.

---

## Setup & Run

**Prerequisites:** Node.js, `@sap/cds-dk`.

```bash
# 1. install dependencies
npm install

# 2. place the raw DOT CSVs into:
#    data-raw/marketing/   (Marketing_Carrier files)
#    data-raw/reporting/   (Reporting_Carrier files)

# 3. transform raw CSVs into the lean schema
node transform.js

# 4. create the schema (hide CSVs so cds deploy loads no data)
mkdir -p db/_data_hidden && mv db/data/*.csv db/_data_hidden/
rm -f db/flights.sqlite
cds deploy --to sqlite:db/flights.sqlite
mv db/_data_hidden/*.csv db/data/ && rmdir db/_data_hidden

# 5. load the raw data (streaming) and compute the KPI tables
node load-db.js
node materialize.js

# 6. start the server
CDS_REQUIRES_DB_KIND=sqlite CDS_REQUIRES_DB_CREDENTIALS_URL=db/flights.sqlite \
  cds watch --profile development
```

The dashboards are then reachable at, e.g.:
`http://localhost:4004/ns.airlinedashboard/index.html`
(and `ns.monthlytrend`, `ns.weekdaytrend`, `ns.brandoperator`).

---

## Task 1 — Data Visualization

Four Analytical List Page dashboards address the three Task 1 requirements:

| Dashboard | Entity | Visualization | Insight |
|---|---|---|---|
| Airline performance | `AirlineKPIs` | Column chart + KPI table | On-time %, cancellation %, avg. arrival delay per carrier |
| Monthly trend | `MonthlyKPIs` | Line chart | Seasonal bottleneck — delays peak in Jun/Jul, best in Sep |
| Weekday trend | `WeekdayKPIs` | Line chart | Weekly pattern — Tuesday best, Sunday worst |
| Brand vs. operator | `BrandVsOperator` | Column chart (Brand/Operator) | Brand-promise vs. operational-reality discrepancy in code-share flights |

Each dashboard exposes an interactive filter, a chart, and a sortable KPI table
over the full-year dataset.

---

---

## Task 2 — Classification

Two classification dashboards provide structured performance categorization:

| Dashboard | Entity | Classification Logic | Insight |
|---|---|---|---|
| Carrier reliability | `CarrierClassification` | Tiers based on on-time %, cancellation rate | All 10 carriers fall in "Good" tier (70–85% on-time, <3% cancellation); DL leads at 81.1% |
| Delay severity | `FlightDelayClassification` | DOT-aligned thresholds: OnTime/Minor/Moderate/Severe/Critical/Cancelled | 62.9% on-time, 15.7% minor, 10.8% moderate, 7.1% severe, 3.3% critical, 1.4% cancelled |

**Classification thresholds (Carrier Reliability):**
- **Excellent**: On-time ≥ 85%, cancellation < 1%
- **Good**: On-time ≥ 70%, cancellation < 3%
- **At Risk**: On-time ≥ 50%
- **Poor**: On-time < 50% or cancellation ≥ 5%

**Classification thresholds (Delay Severity):**
- **OnTime**: ArrDelayMinutes ≤ 0 | **Minor**: 1–15 min | **Moderate**: 16–45 min
- **Severe**: 46–120 min | **Critical**: >120 min | **Cancelled**: flight cancelled

Thresholds align with the U.S. DOT standard, which considers arrivals >15 minutes
late as "delayed."

---



## Architectural Decisions

**Fact layer vs. aggregation layer.** Raw flights (~6.4M marketing rows) are kept
as fact tables; the four KPI tables are pre-computed aggregates. The Fiori
dashboards query the small aggregate tables (10 / 10 / 7 / 26 rows), which keeps
them responsive and avoids live `GROUP BY` over millions of rows. This separation
is also the foundation for Task 2 (Classification) and Task 4 (AI), which consume
compact KPIs rather than raw rows.

**Weighted KPIs.** Percentages and average delays are computed from raw additive
sums (e.g. `SUM(delay minutes) / SUM(flights)`), not as an average of
per-group averages, so the aggregates are correctly weighted by flight volume.

**Brand vs. operator within one table.** The marketing-vs-operating discrepancy
is derived from `Marketing_Airline` vs. `Operating_Airline` within the marketing
dataset, avoiding a fragile cross-file join while still surfacing code-share
performance differences.

---

## Version Control & Branching Strategy

- **`main`** — Stable, presentable state. Only receives merges from `dev` at
  milestones (midterm, endterm). Tagged with version numbers (e.g. `v1.0-midterm`).
- **`dev`** — Active development branch. All feature work happens here.
  Team members pull from and push to `dev` daily.
- **Feature workflow**: For larger features, members create short-lived branches
  off `dev` (e.g. `task2-classification`), then merge back via pull request or
  direct merge.

### Commit History

| Date | Author | Description |
|------|--------|-------------|
| June 2026 | Muheb | Task 1: Data pipeline, schema, materialized KPIs, Fiori dashboards |
| June 2026 | Yogesh | Task 2: Carrier classification & flight delay severity classification |
| June 2026 | Hemant | Task 2: Carrier classification & flight delay severity classification |

### Milestone Merges

- **Midterm (12.06.2026)**: `dev` → `main`, tagged `v1.0-midterm`
