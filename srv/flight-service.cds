using flightaudit as fa from '../db/schema';

// ===== Service: liest aus den materialisierten KPI-Tabellen =====

service FlightService {
  entity MarketingFlights as projection on fa.MarketingFlights;
  entity ReportingFlights as projection on fa.ReportingFlights;

  @readonly entity AirlineKPIs     as projection on fa.MAirlineKPIs;
  @readonly entity MonthlyKPIs     as projection on fa.MMonthlyKPIs;
  @readonly entity WeekdayKPIs     as projection on fa.MWeekdayKPIs;
  @readonly entity BrandVsOperator as projection on fa.MBrandVsOperator;
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