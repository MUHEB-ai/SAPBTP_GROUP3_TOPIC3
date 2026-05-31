using flightaudit as fa from '../db/schema';

// ===== Stufe 1: Aggregation (rohe, additive Summen) =====

view AggAirlineKPIs as select from fa.MarketingFlights {
  key MarketingAirline as Airline,
      count(*)             as TotalFlights      : Integer,
      sum(Cancelled)       as CancelledFlights  : Integer,
      sum(Diverted)        as DivertedFlights   : Integer,
      sum(ArrDel15)        as DelayedArrivals    : Integer,
      sum(ArrDelayMinutes) as SumArrDelayMin     : Integer,
      sum(DepDelayMinutes) as SumDepDelayMin     : Integer
} group by MarketingAirline;

view AggMonthlyKPIs as select from fa.MarketingFlights {
  key Month,
      count(*)             as TotalFlights     : Integer,
      sum(Cancelled)       as CancelledFlights : Integer,
      sum(Diverted)        as DivertedFlights  : Integer,
      sum(ArrDel15)        as DelayedArrivals  : Integer,
      sum(ArrDelayMinutes) as SumArrDelayMin   : Integer
} group by Month;

view AggWeekdayKPIs as select from fa.MarketingFlights {
  key DayOfWeek,
      count(*)             as TotalFlights     : Integer,
      sum(Cancelled)       as CancelledFlights : Integer,
      sum(Diverted)        as DivertedFlights  : Integer,
      sum(ArrDel15)        as DelayedArrivals  : Integer,
      sum(ArrDelayMinutes) as SumArrDelayMin   : Integer
} group by DayOfWeek;

view AggBrandVsOperator as select from fa.MarketingFlights {
  key MarketingAirline as Brand,
  key OperatingAirline as Operator,
      count(*)             as TotalFlights    : Integer,
      sum(ArrDel15)        as DelayedArrivals : Integer,
      sum(ArrDelayMinutes) as SumArrDelayMin  : Integer
} group by MarketingAirline, OperatingAirline;

// ===== Stufe 2: berechnete KPIs (Prozente/Durchschnitte, gerundet) =====

view CalcAirlineKPIs as select from AggAirlineKPIs {
  Airline, TotalFlights, CancelledFlights, DivertedFlights, DelayedArrivals,
  cast( round( (TotalFlights - CancelledFlights - DivertedFlights - DelayedArrivals) * 100.0
        / nullif(TotalFlights - CancelledFlights - DivertedFlights, 0), 1) as Decimal(5,1) ) as OnTimePct       : Decimal(5,1),
  cast( round( CancelledFlights * 100.0 / nullif(TotalFlights, 0), 1) as Decimal(5,1) ) as CancellationPct : Decimal(5,1),
  cast( round( SumArrDelayMin * 1.0 / nullif(TotalFlights - CancelledFlights, 0), 1) as Decimal(6,1) ) as AvgArrDelay : Decimal(6,1)
};

view CalcMonthlyKPIs as select from AggMonthlyKPIs {
  Month, TotalFlights, CancelledFlights, DelayedArrivals,
  cast( (TotalFlights - CancelledFlights - DelayedArrivals) * 100.0
        / nullif(TotalFlights - CancelledFlights, 0) as Decimal(5,2) ) as OnTimePct      : Decimal(5,2),
  cast( CancelledFlights * 100.0 / nullif(TotalFlights, 0) as Decimal(5,2) ) as CancellationPct : Decimal(5,2),
  cast( SumArrDelayMin * 1.0 / nullif(TotalFlights - CancelledFlights, 0) as Decimal(8,2) ) as AvgArrDelay : Decimal(8,2)
};

view CalcWeekdayKPIs as select from AggWeekdayKPIs {
  DayOfWeek, TotalFlights, CancelledFlights, DelayedArrivals,
  cast( (TotalFlights - CancelledFlights - DelayedArrivals) * 100.0
        / nullif(TotalFlights - CancelledFlights, 0) as Decimal(5,2) ) as OnTimePct      : Decimal(5,2),
  cast( SumArrDelayMin * 1.0 / nullif(TotalFlights - CancelledFlights, 0) as Decimal(8,2) ) as AvgArrDelay : Decimal(8,2)
};

view CalcBrandVsOperator as select from AggBrandVsOperator {
  Brand, Operator, TotalFlights, DelayedArrivals,
  cast( (TotalFlights - DelayedArrivals) * 100.0 / nullif(TotalFlights, 0) as Decimal(5,2) ) as OnTimePct  : Decimal(5,2),
  cast( SumArrDelayMin * 1.0 / nullif(TotalFlights, 0) as Decimal(8,2) ) as AvgArrDelay : Decimal(8,2)
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

// ===== analytische Annotationen (für die ALP) =====

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