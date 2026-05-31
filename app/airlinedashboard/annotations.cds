using FlightService as service from '../../srv/flight-service';

annotate service.AirlineKPIs with @(
  UI.SelectionFields : [ Airline ],

  UI.LineItem : [
    { $Type: 'UI.DataField', Value: Airline,         Label: 'Airline' },
    { $Type: 'UI.DataField', Value: TotalFlights,    Label: 'Flights' },
    { $Type: 'UI.DataField', Value: OnTimePct,       Label: 'On-Time %' },
    { $Type: 'UI.DataField', Value: CancellationPct, Label: 'Cancellation %' },
    { $Type: 'UI.DataField', Value: AvgArrDelay,     Label: 'Avg Arr Delay (min)' }
  ],

  UI.Chart : {
    $Type      : 'UI.ChartDefinitionType',
    ChartType  : #Column,
    Title      : 'On-Time Performance by Airline',
    Dimensions : [ Airline ],
    Measures   : [ DelayedArrivals ],
    MeasureAttributes : [{
      $Type   : 'UI.ChartMeasureAttributeType',
      Measure : DelayedArrivals,
      Role    : #Axis1
    }]
  },

  UI.PresentationVariant : {
    $Type          : 'UI.PresentationVariantType',
    Visualizations : [ '@UI.Chart', '@UI.LineItem' ]
  }
);

annotate service.AirlineKPIs with {
  OnTimePct       @Common.Label: 'On-Time %'       @odata.Type: 'Edm.Decimal' @odata.Scale: 1;
  CancellationPct @Common.Label: 'Cancellation %'  @odata.Type: 'Edm.Decimal' @odata.Scale: 1;
  AvgArrDelay     @Common.Label: 'Avg Arr Delay'   @odata.Type: 'Edm.Decimal' @odata.Scale: 1;
};