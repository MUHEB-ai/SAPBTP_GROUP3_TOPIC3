using flightaudit as fa from '../db/schema';

// ===== Stufe 1: Aggregation =====

view AggAirlineKPIs as select from fa.MarketingFlights {
  key MarketingAirline as Airline,
      count(*)             as TotalFlights     : Integer,
      sum(Cancelled)       as CancelledFlights : Integer,
      sum(Diverted)        as DivertedFlights  : Integer,
      sum(ArrDel15)        as DelayedArrivals  : Integer,
      avg(ArrDelayMinutes) as AvgArrDelay      : Decimal(8,2),
      avg(DepDelayMinutes) as AvgDepDelay      : Decimal(8,2)
} group by MarketingAirline;

view AggMonthlyKPIs as select from fa.MarketingFlights {
  key Month,
      count(*)             as TotalFlights     : Integer,
      sum(Cancelled)       as CancelledFlights : Integer,
      sum(Diverted)        as DivertedFlights  : Integer,
      sum(ArrDel15)        as DelayedArrivals  : Integer,
      avg(ArrDelayMinutes) as AvgArrDelay      : Decimal(8,2)
} group by Month;

view AggWeekdayKPIs as select from fa.MarketingFlights {
  key DayOfWeek,
      count(*)             as TotalFlights     : Integer,
      sum(Cancelled)       as CancelledFlights : Integer,
      sum(Diverted)        as DivertedFlights  : Integer,
      sum(ArrDel15)        as DelayedArrivals  : Integer,
      avg(ArrDelayMinutes) as AvgArrDelay      : Decimal(8,2)
} group by DayOfWeek;

view AggBrandVsOperator as select from fa.MarketingFlights {
  key MarketingAirline as Brand,
  key OperatingAirline as Operator,
      count(*)             as TotalFlights    : Integer,
      sum(ArrDel15)        as DelayedArrivals : Integer,
      avg(ArrDelayMinutes) as AvgArrDelay     : Decimal(8,2)
} group by MarketingAirline, OperatingAirline;

// ===== Stufe 2: berechnete KPIs (Prozente) =====

view CalcAirlineKPIs as select from AggAirlineKPIs {
  Airline, TotalFlights, CancelledFlights, DivertedFlights, DelayedArrivals,
  AvgArrDelay, AvgDepDelay,
  cast( (TotalFlights - CancelledFlights - DivertedFlights - DelayedArrivals) * 100.0
        / nullif(TotalFlights - CancelledFlights - DivertedFlights, 0) as Decimal(5,2) ) as OnTimePct      : Decimal(5,2),
  cast( CancelledFlights * 100.0 / nullif(TotalFlights, 0) as Decimal(5,2) ) as CancellationPct : Decimal(5,2),
  cast( DivertedFlights  * 100.0 / nullif(TotalFlights, 0) as Decimal(5,2) ) as DiversionPct    : Decimal(5,2)
};

view CalcMonthlyKPIs as select from AggMonthlyKPIs {
  Month, TotalFlights, CancelledFlights, DivertedFlights, DelayedArrivals, AvgArrDelay,
  cast( (TotalFlights - CancelledFlights - DivertedFlights - DelayedArrivals) * 100.0
        / nullif(TotalFlights - CancelledFlights - DivertedFlights, 0) as Decimal(5,2) ) as OnTimePct      : Decimal(5,2),
  cast( CancelledFlights * 100.0 / nullif(TotalFlights, 0) as Decimal(5,2) ) as CancellationPct : Decimal(5,2)
};

view CalcWeekdayKPIs as select from AggWeekdayKPIs {
  DayOfWeek, TotalFlights, CancelledFlights, DivertedFlights, DelayedArrivals, AvgArrDelay,
  cast( (TotalFlights - CancelledFlights - DivertedFlights - DelayedArrivals) * 100.0
        / nullif(TotalFlights - CancelledFlights - DivertedFlights, 0) as Decimal(5,2) ) as OnTimePct      : Decimal(5,2),
  cast( CancelledFlights * 100.0 / nullif(TotalFlights, 0) as Decimal(5,2) ) as CancellationPct : Decimal(5,2)
};

view CalcBrandVsOperator as select from AggBrandVsOperator {
  Brand, Operator, TotalFlights, DelayedArrivals, AvgArrDelay,
  cast( (TotalFlights - DelayedArrivals) * 100.0 / nullif(TotalFlights, 0) as Decimal(5,2) ) as OnTimePct : Decimal(5,2)
};

// ===== Service =====

service FlightService {
  entity MarketingFlights as projection on fa.MarketingFlights;
  entity ReportingFlights as projection on fa.ReportingFlights;

  @readonly entity AirlineKPIs     as projection on CalcAirlineKPIs;
  @readonly entity MonthlyKPIs     as projection on CalcMonthlyKPIs;
  @readonly entity WeekdayKPIs     as projection on CalcWeekdayKPIs;
  @readonly entity BrandVsOperator as projection on CalcBrandVsOperator;
}

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
  TotalFlights     @Analytics.Measure  @Aggregation.default: #SUM;
  CancelledFlights @Analytics.Measure  @Aggregation.default: #SUM;
  DivertedFlights  @Analytics.Measure  @Aggregation.default: #SUM;
  DelayedArrivals  @Analytics.Measure  @Aggregation.default: #SUM;
};