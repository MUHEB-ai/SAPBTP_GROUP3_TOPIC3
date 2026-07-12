using flightaudit as fa from '../db/schema';

// ===== Service: liest aus den materialisierten KPI-Tabellen =====

service FlightService {
  entity MarketingFlights as projection on fa.MarketingFlights;
  entity ReportingFlights as projection on fa.ReportingFlights;

  @readonly entity AirlineKPIs     as projection on fa.MAirlineKPIs;
  @readonly entity MonthlyKPIs     as projection on fa.MMonthlyKPIs;
  @readonly entity WeekdayKPIs     as projection on fa.MWeekdayKPIs;
  @readonly entity BrandVsOperator as projection on fa.MBrandVsOperator;
  @readonly entity CarrierClassification      as projection on fa.MCarrierClassification;
  @readonly entity FlightDelayClassification  as projection on fa.MFlightDelayClassification;

  entity AIAuditReports as projection on fa.AIAuditReports;

  action analyzeDelay(airline: String, delayScenario: String) returns String;
  action generateRecovery(airline: String, reliabilityTier: String, delayType: String) returns String;
  action generateCarrierReport(airline: String) returns String;
}

// ===== analytische Annotationen (für die ALPs) =====

// --- AirlineKPIs ---
annotate FlightService.AirlineKPIs with @Aggregation.ApplySupported : {
  $Type               : 'Aggregation.ApplySupportedType',
  Transformations     : [ 'aggregate', 'groupby', 'filter' ],
  GroupableProperties : [ Airline ],
  AggregatableProperties : [
    { Property: TotalFlights },
    { Property: CancelledFlights },
    { Property: DivertedFlights },
    { Property: DelayedArrivals }
  ]
}
@Aggregation.CustomAggregate #TotalFlights     : 'Edm.Int32'
@Aggregation.CustomAggregate #CancelledFlights : 'Edm.Int32'
@Aggregation.CustomAggregate #DivertedFlights  : 'Edm.Int32'
@Aggregation.CustomAggregate #DelayedArrivals  : 'Edm.Int32';

annotate FlightService.AirlineKPIs with {
  Airline          @Analytics.Dimension;
  TotalFlights     @Analytics.Measure @Aggregation.default: #SUM;
  CancelledFlights @Analytics.Measure @Aggregation.default: #SUM;
  DivertedFlights  @Analytics.Measure @Aggregation.default: #SUM;
  DelayedArrivals  @Analytics.Measure @Aggregation.default: #SUM;
};

// --- MonthlyKPIs ---
annotate FlightService.MonthlyKPIs with @Aggregation.ApplySupported : {
  $Type               : 'Aggregation.ApplySupportedType',
  Transformations     : [ 'aggregate', 'groupby', 'filter' ],
  GroupableProperties : [ Month ],
  AggregatableProperties : [
    { Property: TotalFlights },
    { Property: CancelledFlights },
    { Property: DelayedArrivals }
  ]
}
@Aggregation.CustomAggregate #TotalFlights     : 'Edm.Int32'
@Aggregation.CustomAggregate #CancelledFlights : 'Edm.Int32'
@Aggregation.CustomAggregate #DelayedArrivals  : 'Edm.Int32';

annotate FlightService.MonthlyKPIs with {
  Month            @Analytics.Dimension;
  TotalFlights     @Analytics.Measure @Aggregation.default: #SUM;
  CancelledFlights @Analytics.Measure @Aggregation.default: #SUM;
  DelayedArrivals  @Analytics.Measure @Aggregation.default: #SUM;
};

// --- WeekdayKPIs ---
annotate FlightService.WeekdayKPIs with @Aggregation.ApplySupported : {
  $Type               : 'Aggregation.ApplySupportedType',
  Transformations     : [ 'aggregate', 'groupby', 'filter' ],
  GroupableProperties : [ DayOfWeek ],
  AggregatableProperties : [
    { Property: TotalFlights },
    { Property: CancelledFlights },
    { Property: DelayedArrivals }
  ]
}
@Aggregation.CustomAggregate #TotalFlights     : 'Edm.Int32'
@Aggregation.CustomAggregate #CancelledFlights : 'Edm.Int32'
@Aggregation.CustomAggregate #DelayedArrivals  : 'Edm.Int32';

annotate FlightService.WeekdayKPIs with {
  DayOfWeek        @Analytics.Dimension;
  TotalFlights     @Analytics.Measure @Aggregation.default: #SUM;
  CancelledFlights @Analytics.Measure @Aggregation.default: #SUM;
  DelayedArrivals  @Analytics.Measure @Aggregation.default: #SUM;
};

// --- BrandVsOperator ---
annotate FlightService.BrandVsOperator with @Aggregation.ApplySupported : {
  $Type               : 'Aggregation.ApplySupportedType',
  Transformations     : [ 'aggregate', 'groupby', 'filter' ],
  GroupableProperties : [ Brand, Operator ],
  AggregatableProperties : [
    { Property: TotalFlights },
    { Property: DelayedArrivals }
  ]
}
@Aggregation.CustomAggregate #TotalFlights    : 'Edm.Int32'
@Aggregation.CustomAggregate #DelayedArrivals : 'Edm.Int32';

annotate FlightService.BrandVsOperator with {
  Brand           @Analytics.Dimension;
  Operator        @Analytics.Dimension;
  TotalFlights    @Analytics.Measure @Aggregation.default: #SUM;
  DelayedArrivals @Analytics.Measure @Aggregation.default: #SUM;
};

annotate FlightService.AirlineKPIs     with { DelayedArrivals @title: 'Delayed Arrivals'; };
annotate FlightService.MonthlyKPIs     with { DelayedArrivals @title: 'Delayed Arrivals'; };
annotate FlightService.WeekdayKPIs     with { DelayedArrivals @title: 'Delayed Arrivals'; };
annotate FlightService.BrandVsOperator with { DelayedArrivals @title: 'Delayed Arrivals'; };

// --- CarrierClassification ---
annotate FlightService.CarrierClassification with @(
  UI.HeaderInfo: {
    TypeName: 'Carrier',
    TypeNamePlural: 'Carrier Classification'
  },
  UI.LineItem: [
    { Value: Airline,         Label: 'Airline Code' },
    { Value: ReliabilityTier, Label: 'Reliability Tier', Criticality: TierCriticality },
    { Value: OnTimePct,       Label: 'On-Time %' },
    { Value: CancellationPct, Label: 'Cancellation %' },
    { Value: AvgArrDelay,     Label: 'Avg Arrival Delay (min)' },
    { Value: TotalFlights,    Label: 'Total Flights' }
  ],
  UI.SelectionFields: [ Airline, ReliabilityTier ]
);

// --- FlightDelayClassification ---
annotate FlightService.FlightDelayClassification with @(
  UI.HeaderInfo: {
    TypeName: 'Delay Category',
    TypeNamePlural: 'Flight Delay Classification'
  },
  UI.LineItem: [
    { Value: Category,    Label: 'Delay Category', Criticality: Criticality },
    { Value: FlightCount, Label: 'Number of Flights' },
    { Value: Percentage,  Label: '% of All Flights' },
    { Value: AvgDelay,    Label: 'Avg Delay (min)' }
  ]
);

// --- AIAuditReports ---
annotate FlightService.AIAuditReports with @(
  UI.HeaderInfo: {
    TypeName: 'AI Audit Report',
    TypeNamePlural: 'AI Audit Reports',
    Title: { Value: Airline },
    Description: { Value: DelayScenario }
  },
  UI.CreateHidden: false,
  Capabilities.InsertRestrictions: { Insertable: true },
  UI.LineItem: [
    {
      $Type: 'UI.DataFieldForAction',
      Action: 'FlightService.EntityContainer/analyzeDelay',
      Label: 'Analyze Delay'
    },
    { Value: Airline,         Label: 'Airline' },
    { Value: ReliabilityTier, Label: 'Tier' },
    { Value: DelayScenario,   Label: 'Delay Scenario' },
    { Value: CreatedAt,       Label: 'Created' }
  ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Delay Input', Target: '@UI.FieldGroup#Input' },
    { $Type: 'UI.ReferenceFacet', Label: 'AI Reasoning', Target: '@UI.FieldGroup#AIReasoning' },
    { $Type: 'UI.ReferenceFacet', Label: 'Recovery Strategy', Target: '@UI.FieldGroup#Recovery' }
  ],
  UI.FieldGroup#Input: {
    Data: [
      { Value: Airline, Label: 'Airline Code' },
      { Value: DelayScenario, Label: 'Describe the Delay Scenario' }
    ]
  },
  UI.FieldGroup#AIReasoning: {
    Data: [{ Value: AIReasoning, Label: 'AI Analysis' }]
  },
  UI.FieldGroup#Recovery: {
    Data: [{ Value: RecoveryStrategy, Label: 'Recovery Recommendations' }]
  }
);
