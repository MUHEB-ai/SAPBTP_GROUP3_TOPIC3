using FlightService as service from '../../srv/flight-service';

annotate service.AirlineKPIs with @(
  UI.SelectionFields : [ Airline ],

  UI.LineItem : [
    { $Type: 'UI.DataField', Value: Airline,          Label: 'Airline' },
    { $Type: 'UI.DataField', Value: TotalFlights,     Label: 'Flights' },
    { $Type: 'UI.DataField', Value: OnTimePct,        Label: 'On-Time %' },
    { $Type: 'UI.DataField', Value: CancellationPct,  Label: 'Cancellation %' },
    { $Type: 'UI.DataField', Value: AvgArrDelay,      Label: 'Avg Arr Delay (min)' }
  ],

  UI.Chart : {
    $Type           : 'UI.ChartDefinitionType',
    ChartType       : #Column,
    Dimensions      : [ Airline ],
    Measures        : [ TotalFlights ],
    MeasureAttributes : [{
      $Type     : 'UI.ChartMeasureAttributeType',
      Measure   : TotalFlights,
      Role      : #Axis1
    }]
  },

  UI.PresentationVariant : {
    $Type          : 'UI.PresentationVariantType',
    Visualizations : [ '@UI.Chart', '@UI.LineItem' ]
  }
);