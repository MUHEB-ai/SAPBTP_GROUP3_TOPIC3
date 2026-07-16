# Airline On-Time Performance Audit: SAP BTP
**Data Analysis on the SAP Business Technology Platform: Summer Semester 2026**
Saarland University · Group 3 · Topic 3

An AI-enhanced operational audit dashboard for U.S. domestic airline on-time
performance, built on SAP Cloud Application Programming Model (CAP) and SAP Fiori
Elements. Beyond static reporting, the system interprets performance patterns and
generates operational recovery recommendations using AI integration via SAP AI Core.

---

## Tech Stack
- **Backend:** SAP CAP (Node.js / JavaScript)
- **Frontend:** SAP Fiori Elements (List Report with analytical chart annotations + Object Page)
- **API:** OData V4
- **Database:** SQLite (development) / SAP HANA Cloud (production)
- **AI:** SAP AI Core Orchestration (gpt-4o-mini via Generative AI Hub)
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
│   ├── carrierclassification/    #   Task 2: Carrier reliability tiers + PDF report
│   ├── delayseverity/            #   Task 2: Flight delay severity distribution
│   ├── delaycausetime/           #   Task 3: Delay cause by time of day
│   ├── delaycausemonth/          #   Task 3: Delay cause by month
│   ├── delaybyduration/          #   Task 3: Delay behavior by flight duration
│   └── aiaudit/                  #   Task 4: AI operational analysis
├── approuter/                    # App Router + native Fiori Launchpad (flp.html)
├── db/
│   ├── schema.cds                # Data model: raw tables + KPI + classification + Task 3 tables
│   └── data/                     # Lean transformed CSVs (git-ignored)
├── srv/
│   ├── flight-service.cds        # OData service + analytical annotations
│   └── flight-service.js         # CAP handler: AI Core orchestration + PDF generation
├── transform.js                  # Stream-transforms raw DOT CSVs into the lean schema
├── load-db.js                    # Streaming import of the lean CSVs into SQLite
├── materialize.js                # Pre-computes KPI aggregates + classification + Task 3 tables
├── mta.yaml                      # MTA deployment descriptor for Cloud Foundry
├── xs-security.json              # XSUAA security configuration
└── package.json
```

> **Not in the repository (git-ignored):** raw CSVs (`data-raw/`), the SQLite
> database (`*.sqlite`) and `node_modules/`. The database is reproducible from
> the raw data via the pipeline below.

---

## Data Pipeline
The full dataset is ~12.3 million rows, which exceeds the limits of `cds deploy`
(Node string-length cap on a single CSV read). The pipeline works around this
with a streaming loader and a pre-computed aggregation layer.

1. **`transform.js`** : reads the raw DOT CSVs from `data-raw/marketing/` and
   `data-raw/reporting/`, extracts the relevant columns, and writes lean CSVs.
2. **`cds deploy`** (with CSVs temporarily hidden) : creates the schema without loading data.
3. **`load-db.js`** : streams the lean CSVs row-by-row into SQLite using
   `better-sqlite3`, bypassing the `cds deploy` string-length limit.
4. **`materialize.js`** : computes all aggregate KPI, classification, and
   association tables from the raw tables via SQL `GROUP BY`.

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

# 5. load the raw data (streaming) and compute the aggregate tables
node load-db.js
node materialize.js

# 6. start the server
CDS_REQUIRES_DB_KIND=sqlite CDS_REQUIRES_DB_CREDENTIALS_URL=db/flights.sqlite \
  cds watch --profile development
```

---

## Task 1 : Data Visualization
Four dashboards provide an aggregated view of airline reliability and network performance:

| Dashboard | Entity | Visualization | Key Insight |
|---|---|---|---|
| On-Time Performance | `AirlineKPIs` | Column chart + table | DL leads at 81.1% on-time; F9 trails at 72.0% |
| Monthly Trend | `MonthlyKPIs` | Line chart | Delays peak Jun/Jul; Sep is calmest |
| Weekday Trend | `WeekdayKPIs` | Line chart | Mid-week best; weekend worst |
| Brand vs. Operator | `BrandVsOperator` | Column chart | Code-share gaps between brand and operator |

---

## Task 2 : Classification
Two classification schemes structure performance data into actionable categories:

| Dashboard | Entity | Classification Logic | Key Insight |
|---|---|---|---|
| Carrier Reliability | `CarrierClassification` | Composite reliability score + quartile tiers | HA/DL/WN Excellent; AA/F9 Poor |
| Delay Severity | `FlightDelayClassification` | DOT-aligned severity thresholds | 62.9% on-time, 15.7% minor, 10.8% moderate, 7.1% severe, 3.3% critical, 1.4% cancelled |

**Carrier Reliability Score.** Rather than judging carriers on on-time rate alone,
each carrier receives a composite score (0–100) combining three min-max normalized
metrics: on-time rate (weighted 50%), cancellation rate (30%), and average arrival
delay (20%). Carriers are then sorted into four tiers by quartile (`NTILE(4)`) of this
score : **Excellent**, **Good**, **Fair**, **Poor** , so the tiers are data-driven and
always meaningfully distributed. This surfaces insights a single metric hides: for
example, American Airlines falls to the "Poor" tier despite a mid-range on-time rate,
because of its high cancellation rate and long average delay.

Cancelled flights are shown with no average-delay value (N/A) rather than zero, since
a cancelled flight never arrives and recording it as zero would distort delay averages.

Severity thresholds align with the U.S. DOT standard (BTS On-Time Performance,
https://www.transtats.bts.gov), which defines arrivals >15 minutes late as "delayed."

---

## Task 3 : Association Analysis
Three dashboards explore relationships between delay causes and operational/temporal factors:

| Dashboard | Entity | Analysis | Key Insight |
|---|---|---|---|
| Delay Cause by Time | `DelayCauseByTime` | Delay-cause minutes by departure hour | Late-aircraft delay accumulates through the day, peaking 17:00–19:00 |
| Delay Cause by Month | `DelayCauseByMonth` | Delay-cause minutes by month | Delays surge in Jun/Jul across all causes |
| Delay by Duration | `DelayByDuration` | Avg delay by short/medium/long haul | Delay is flat across flight length (~16–18 min) |

Together these show that delay is a **systemic, time-based** problem driven by the
late-aircraft "knock-on" cascade, not by route or flight length. Duration bands
(short <2h, medium 2–4h, long >4h) follow the conventional commercial-aviation split.

---

## Task 4 : AI Integration
AI-driven operational analysis via the SAP AI Core orchestration endpoint:

| Feature | Description |
|---|---|
| **Delay Analysis** | Interprets ripple effects of a delay scenario using carrier context and reliability tier |
| **Recovery Strategy** | Generates operational recovery recommendations grounded in Task 2 tiers |
| **Management PDF** | One-click downloadable management report with KPIs, tier, and an AI executive summary |
| **Fiori Integration** | Native Object Page with "Analyze Delay" action, AI Reasoning tab, and native "Generate Report" toolbar action |

**Architecture:** CAP handler (`flight-service.js`) → OAuth token request →
SAP AI Core orchestration endpoint → gpt-4o-mini with few-shot aviation prompts →
response rendered in the Fiori Object Page / PDF. Credentials are held in
environment variables, not in source. The orchestration layer is model-agnostic:
switching to LLAMA requires only changing the `model_name` parameter.

---

## Architectural Decisions
**Fact layer vs. aggregation layer.** Raw flights are kept as fact tables; the KPI,
classification, and association tables are pre-computed aggregates (3–26 rows each),
keeping dashboards responsive with sub-second query times.

**Weighted KPIs.** Percentages and average delays are computed from raw additive sums
(`SUM(delay minutes) / SUM(flights)`), not as an average of per-group averages,
ensuring correct weighting by flight volume.

**Grounded prompting.** AI prompts inject only a small, verified factual snapshot per
carrier (never raw data), keeping the context small and preventing hallucination, and
use aviation-specific few-shot examples to optimize for logistics terminology without
weight-level fine-tuning.

---

## Version Control & Branching Strategy
- **`main`** — Stable, presentable state. Receives merges from `dev` at milestones.
- **`dev`** — Active development branch. All feature work happens here.

### Contributions
| Member | Contribution |
|---|---|
| Muheb Al Najjar | Task 1: data pipeline, CDS schema, Fiori dashboards; presentation slides |
| Yogesh Kulkarni | Task 2: composite reliability classification and delay severity; Task 3: association analysis; Task 4: AI integration and SAP AI Core orchestration; management PDF; deployment |
| Hemanth Kumar Neelapu | Task 2: Fiori annotations & dashboard views; testing; presentation slides |

### Milestone Merges
- **Midterm (12.06.2026)**: `dev` → `main`, tagged `v1.0-midterm`
- **Endterm (17.07.2026)**: `dev` → `main`, tagged `v2.0-endterm`
