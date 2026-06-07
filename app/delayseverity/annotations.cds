using FlightService as service from '../../srv/flight-service';

annotate service.FlightDelayClassification with @(
  UI.Chart: {
    ChartType: #Donut,
    Dimensions: [Category],
    Measures: [FlightCount],
    Title: 'Flight Delay Severity Distribution'
  }
);