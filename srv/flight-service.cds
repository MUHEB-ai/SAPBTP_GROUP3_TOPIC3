using flightaudit as fa from '../db/schema';

// --- Aggregierte Views (eigene Namen, damit keine Kollision mit den Service-Entities) ---

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
      sum(ArrDel15)        as DelayedArrivals  : Integer,
      avg(ArrDelayMinutes) as AvgArrDelay      : Decimal(8,2)
} group by Month;

view AggWeekdayKPIs as select from fa.MarketingFlights {
  key DayOfWeek,
      count(*)             as TotalFlights     : Integer,
      sum(Cancelled)       as CancelledFlights : Integer,
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

// --- Service exponiert Rohdaten + die Views ---

service FlightService {
  entity MarketingFlights as projection on fa.MarketingFlights;
  entity ReportingFlights as projection on fa.ReportingFlights;

  @readonly entity AirlineKPIs     as projection on AggAirlineKPIs;
  @readonly entity MonthlyKPIs     as projection on AggMonthlyKPIs;
  @readonly entity WeekdayKPIs     as projection on AggWeekdayKPIs;
  @readonly entity BrandVsOperator as projection on AggBrandVsOperator;
}