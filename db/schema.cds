namespace flightaudit;

entity MarketingFlights {
  key ID                : Int64;
      FlightDate        : Date;
      Year              : Integer;
      Month             : Integer;
      DayOfWeek         : Integer;
      MarketingAirline  : String(7);
      OperatingAirline  : String(7);
      CodeShare         : String(20);
      TailNumber        : String(10);
      FlightNum         : String(10);
      Origin            : String(5);
      OriginCity        : String(60);
      OriginState       : String(5);
      Dest              : String(5);
      DestCity          : String(60);
      DestState         : String(5);
      DepDelay          : Decimal(8,2);
      DepDelayMinutes   : Decimal(8,2);
      DepDel15          : Integer;
      DepTimeBlk        : String(11);
      ArrDelay          : Decimal(8,2);
      ArrDelayMinutes   : Decimal(8,2);
      ArrDel15          : Integer;
      ArrTimeBlk        : String(11);
      Cancelled         : Integer;
      CancellationCode  : String(1);
      Diverted          : Integer;
      CRSElapsedTime    : Decimal(8,2);
      ActualElapsedTime : Decimal(8,2);
      AirTime           : Decimal(8,2);
      Distance          : Decimal(8,2);
      CarrierDelay      : Decimal(8,2);
      WeatherDelay      : Decimal(8,2);
      NASDelay          : Decimal(8,2);
      SecurityDelay     : Decimal(8,2);
      LateAircraftDelay : Decimal(8,2);
}

entity ReportingFlights {
  key ID                : Int64;
      FlightDate        : Date;
      Year              : Integer;
      Month             : Integer;
      DayOfWeek         : Integer;
      ReportingAirline  : String(7);
      TailNumber        : String(10);
      FlightNum         : String(10);
      Origin            : String(5);
      OriginCity        : String(60);
      OriginState       : String(5);
      Dest              : String(5);
      DestCity          : String(60);
      DestState         : String(5);
      DepDelay          : Decimal(8,2);
      DepDelayMinutes   : Decimal(8,2);
      DepDel15          : Integer;
      DepTimeBlk        : String(11);
      ArrDelay          : Decimal(8,2);
      ArrDelayMinutes   : Decimal(8,2);
      ArrDel15          : Integer;
      ArrTimeBlk        : String(11);
      Cancelled         : Integer;
      CancellationCode  : String(1);
      Diverted          : Integer;
      CRSElapsedTime    : Decimal(8,2);
      ActualElapsedTime : Decimal(8,2);
      AirTime           : Decimal(8,2);
      Distance          : Decimal(8,2);
      CarrierDelay      : Decimal(8,2);
      WeatherDelay      : Decimal(8,2);
      NASDelay          : Decimal(8,2);
      SecurityDelay     : Decimal(8,2);
      LateAircraftDelay : Decimal(8,2);
}

// Materialisierte KPI-Tabellen (einmal aus den Rohdaten berechnet)
entity MAirlineKPIs {
  key Airline          : String(7);
      TotalFlights     : Integer;
      CancelledFlights : Integer;
      DivertedFlights  : Integer;
      DelayedArrivals  : Integer;
      OnTimePct        : Decimal(5,1);
      CancellationPct  : Decimal(5,1);
      AvgArrDelay      : Decimal(6,1);
}

entity MMonthlyKPIs {
  key Month            : Integer;
      TotalFlights     : Integer;
      CancelledFlights : Integer;
      DelayedArrivals  : Integer;
      OnTimePct        : Decimal(5,1);
      CancellationPct  : Decimal(5,1);
      AvgArrDelay      : Decimal(6,1);
}

entity MWeekdayKPIs {
  key DayOfWeek        : Integer;
      TotalFlights     : Integer;
      CancelledFlights : Integer;
      DelayedArrivals  : Integer;
      OnTimePct        : Decimal(5,1);
      AvgArrDelay      : Decimal(6,1);
}

entity MBrandVsOperator {
  key Brand            : String(7);
  key Operator         : String(7);
      TotalFlights     : Integer;
      DelayedArrivals  : Integer;
      OnTimePct        : Decimal(5,1);
      AvgArrDelay      : Decimal(6,1);
}