using FlightService as service from '../../srv/flight-service';

annotate service.BrandVsOperator with @(
  UI.SelectionFields : [ Brand, Operator ],

  UI.LineItem : [
    { $Type: 'UI.DataField', Value: Brand,           Label: 'Brand (Marketing)' },
    { $Type: 'UI.DataField', Value: Operator,        Label: 'Operator (Operating)' },
    { $Type: 'UI.DataField', Value: TotalFlights,    Label: 'Flights' },
    { $Type: 'UI.DataField', Value: OnTimePct,       Label: 'On-Time %' },
    { $Type: 'UI.DataField', Value: AvgArrDelay,     Label: 'Avg Arr Delay (min)' }
  ],

  UI.Chart : {
    $Type      : 'UI.ChartDefinitionType',
    ChartType  : #Column,
    Title      : 'On-Time by Brand and Operator',
    Dimensions : [ Brand, Operator ],
    Measures   : [ DelayedArrivals ],
    MeasureAttributes : [{
      $Type   : 'UI.ChartMeasureAttributeType',
      Measure : DelayedArrivals,
      Role    : #Axis1
    }]
  },

  UI.PresentationVariant : {
    $Type          : 'UI.PresentationVariantType',
    SortOrder      : [
      { Property: Brand,    Descending: false },
      { Property: Operator, Descending: false }
    ],
    Visualizations : [ '@UI.Chart', '@UI.LineItem' ]
  }
);