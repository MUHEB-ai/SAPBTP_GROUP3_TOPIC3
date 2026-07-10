# Airline On-Time Performance Audit: SAP BTP

**Data Analysis on the SAP Business Technology Platform: Summer Semester 2026**
Saarland University · Group 3 · Topic 3

An AI-enhanced operational audit dashboard for U.S. domestic airline on-time
performance, built on SAP Cloud Application Programming Model (CAP) and SAP Fiori
Elements. The system goes beyond static reporting, it autonomously interprets
performance discrepancies and generates operational recovery strategies using
AI integration via SAP AI Core.

---

## Tech Stack

- **Backend:** SAP CAP (Node.js / JavaScript)
- **Frontend:** SAP Fiori Elements (Analytical List Page + Object Page)
- **API:** OData V4
- **Database:** SQLite (development) / SAP HANA Cloud (production)
- **AI:** SAP AI Core Orchestration (GPT-4o-mini via Generative AI Hub)
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
│   ├── delayseverity/            #   Task 2: Flight delay severity distribution
│   └── aiaudit/                  #   Task 4: AI Operations Control Agent
├── db/
│   ├── schema.cds                # Data model: raw tables + KPI + classification + AI tables
│   └── data/                     # Lean transformed CSVs (git-ignored)
├── srv/
│   ├── flight-service.cds        # OData service + analytical annotations
│   └── flight-service.js         # CAP handler: AI Core orchestration + delay analysis
├── transform.js                  # Stream-transforms raw DOT CSVs into the lean schema
├── load-db.js                    # Streaming import of the lean CSVs into SQLite
├── materialize.js                # Pre-computes KPI aggregates + classification tables
├── mta.yaml                      # MTA deployment descriptor for Cloud Foundry
├── xs-security.json              # XSUAA security configuration
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

1. **`transform.js`** : reads the raw DOT CSVs (~110 columns each) from
   `data-raw/marketing/` and `data-raw/reporting/`, extracts the ~35 relevant
   columns, and writes lean CSVs to `db/data/`.
2. **`cds deploy`** (with the CSVs temporarily hidden) : creates the schema and
   views without loading data.
3. **`load-db.js`** : streams the lean CSVs row-by-row into SQLite using
   `better-sqlite3` (batched inserts, WAL mode), bypassing the `cds deploy`
   string-length limit.
4. **`materialize.js`** : computes all aggregate KPI and classification tables
   from the raw tables via SQL `GROUP BY`.

---

## Setup & Run (Local Development)

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

---

## Task 1 : Data Visualization

Four Analytical List Page dashboards provide an aggregated view of airline
reliability and network performance:

| Dashboard | Entity | Visualization | Key Insight |
|---|---|---|---|
| Airline Performance | `AirlineKPIs` | Column chart + table | DL leads at 81.1% on-time; F9 trails at 72.0% |
| Monthly Trend | `MonthlyKPIs` | Line chart | Delays peak Jun/Jul; Sep is best month |
| Weekday Trend | `WeekdayKPIs` | Line chart | Tuesday best; Sunday worst |
| Brand vs. Operator | `BrandVsOperator` | Column chart | Code-share gaps between brand and operator |

---

## Task 2 : Classification

Two classification schemes structure performance data into actionable categories:

| Dashboard | Entity | Classification Logic | Key Insight |
|---|---|---|---|
| Carrier Reliability | `CarrierClassification` | Tiers based on on-time %, cancellation rate | All 10 carriers in "Good" tier; DL (81.1%) and HA (83.9%) closest to Excellent |
| Delay Severity | `FlightDelayClassification` | DOT-aligned thresholds | 62.9% on-time, 15.7% minor, 10.8% moderate, 7.1% severe, 3.3% critical, 1.4% cancelled |

**Carrier Reliability Tiers:**
- **Excellent**: On-time ≥ 85%, cancellation < 1%
- **Good**: On-time ≥ 70%, cancellation < 3%
- **At Risk**: On-time ≥ 50%
- **Poor**: On-time < 50% or cancellation ≥ 5%

Thresholds align with the U.S. DOT standard (Source: BTS On-Time Performance,
https://www.transtats.bts.gov), which defines arrivals >15 minutes late as "delayed."

---

## Task 4 : AI Integration

AI-driven operational intelligence via SAP AI Core orchestration endpoint:

| Feature | Description |
|---|---|
| **Delay Analysis** | Interprets ripple effects of delay scenarios using carrier context and historical delay patterns from the dataset |
| **Recovery Strategy** | Generates specific operational recovery recommendations grounded in Task 2 classification tiers |
| **Fiori Integration** | Native Fiori Elements Object Page with "Analyze Delay" action button, AI Reasoning tab, and Recovery Strategy tab |
| **Historical Grounding** | Prompts include real delay data from 6.4M flight records (top delayed routes, delay cause breakdowns) |

**Architecture:** CAP handler (`flight-service.js`) → OAuth token request →
SAP AI Core orchestration endpoint → GPT-4o-mini with few-shot aviation prompts
→ Response stored in `AIAuditReports` entity → Rendered in Fiori Object Page.

The orchestration endpoint is model-agnostic, switching to LLAMA requires only
changing the `model_name` parameter when a LLAMA deployment becomes available.

---

## Architectural Decisions

**Fact layer vs. aggregation layer.** Raw flights (~6.4M marketing rows) are kept
as fact tables; the KPI tables are pre-computed aggregates (7–26 rows each),
keeping dashboards responsive with sub-second query times.

**Weighted KPIs.** Percentages and average delays are computed from raw additive
sums (`SUM(delay minutes) / SUM(flights)`), not as an average of per-group
averages, ensuring correct weighting by flight volume.

**Few-shot prompt engineering.** AI prompts include aviation-specific examples
(CarrierDelay, NASDelay, LateAircraftDelay scenarios) and real historical delay
patterns from the dataset, optimizing the model for logistics terminology without
requiring weight-level fine-tuning.

---

## Version Control & Branching Strategy

- **`main`** — Stable, presentable state. Receives merges from `dev` at milestones.
- **`dev`** — Active development branch. All feature work happens here.
- **Feature workflow**: Short-lived branches off `dev` for larger features.

### Contributions

| Member | Contribution |
|---|---|
| Muheb Al Najjar | Task 1: Data pipeline, CDS schema, Fiori dashboards. Task 3: Association analysis |
| Yogesh Kulkarni | Task 2: Carrier classification, delay severity, materialization SQL. Task 4: AI integration, SAP AI Core orchestration, few-shot prompts |
| Hemanth Kumar Neelapu | Task 2: Fiori annotations, dashboard views, CDS graphical model, testing |

### Milestone Merges

- **Midterm (12.06.2026)**: `dev` → `main`, tagged `v1.0-midterm`
- **Endterm (17.07.2026)**: `dev` → `main`, tagged `v2.0-endterm`
