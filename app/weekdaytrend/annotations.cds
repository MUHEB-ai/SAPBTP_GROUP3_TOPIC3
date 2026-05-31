using FlightService as service from '../../srv/flight-service';

annotate service.WeekdayKPIs with @(
  UI.SelectionFields : [ DayOfWeek ],

  UI.LineItem : [
    { $Type: 'UI.DataField', Value: DayOfWeek,    Label: 'Weekday (1=Mon)' },
    { $Type: 'UI.DataField', Value: TotalFlights, Label: 'Flights' },
    { $Type: 'UI.DataField', Value: OnTimePct,    Label: 'On-Time %' },
    { $Type: 'UI.DataField', Value: AvgArrDelay,  Label: 'Avg Arr Delay (min)' }
  ],

  UI.Chart : {
    $Type      : 'UI.ChartDefinitionType',
    ChartType  : #Line,
    Title      : 'On-Time Trend by Weekday',
    Dimensions : [ DayOfWeek ],
    Measures   : [ DelayedArrivals ],
    MeasureAttributes : [{
      $Type   : 'UI.ChartMeasureAttributeType',
      Measure : DelayedArrivals,
      Role    : #Axis1
    }]
  },

  UI.PresentationVariant : {
    $Type          : 'UI.PresentationVariantType',
    SortOrder      : [{ Property: DayOfWeek, Descending: false }],
    Visualizations : [ '@UI.Chart', '@UI.LineItem' ]
  }
);