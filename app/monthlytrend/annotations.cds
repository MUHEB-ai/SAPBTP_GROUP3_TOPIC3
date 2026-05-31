using FlightService as service from '../../srv/flight-service';

annotate service.MonthlyKPIs with @(
  UI.SelectionFields : [ Month ],

  UI.LineItem : [
    { $Type: 'UI.DataField', Value: Month,           Label: 'Month' },
    { $Type: 'UI.DataField', Value: TotalFlights,    Label: 'Flights' },
    { $Type: 'UI.DataField', Value: OnTimePct,       Label: 'On-Time %' },
    { $Type: 'UI.DataField', Value: CancellationPct, Label: 'Cancellation %' },
    { $Type: 'UI.DataField', Value: AvgArrDelay,     Label: 'Avg Arr Delay (min)' }
  ],

  UI.Chart : {
    $Type      : 'UI.ChartDefinitionType',
    ChartType  : #Line,
    Title      : 'On-Time Trend by Month',
    Dimensions : [ Month ],
    Measures   : [ DelayedArrivals ],
    MeasureAttributes : [{
      $Type   : 'UI.ChartMeasureAttributeType',
      Measure : DelayedArrivals,
      Role    : #Axis1
    }]
  },

  UI.PresentationVariant : {
    $Type          : 'UI.PresentationVariantType',
    SortOrder      : [{ Property: Month, Descending: false }],
    Visualizations : [ '@UI.Chart', '@UI.LineItem' ]
  }
);