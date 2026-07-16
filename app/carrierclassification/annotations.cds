using FlightService as service from '../../srv/flight-service';

annotate service.CarrierClassification with @(
  UI.Chart: {
    ChartType: #Bar,
    Dimensions: [Airline],
    Measures: [OnTimePct],
    Title: 'On-Time Performance by Carrier'
  }
);