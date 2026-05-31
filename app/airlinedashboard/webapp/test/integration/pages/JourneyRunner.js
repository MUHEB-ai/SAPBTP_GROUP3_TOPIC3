sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"ns/airlinedashboard/test/integration/pages/AirlineKPIsList",
	"ns/airlinedashboard/test/integration/pages/AirlineKPIsObjectPage"
], function (JourneyRunner, AirlineKPIsList, AirlineKPIsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('ns/airlinedashboard') + '/test/flp.html#app-preview',
        pages: {
			onTheAirlineKPIsList: AirlineKPIsList,
			onTheAirlineKPIsObjectPage: AirlineKPIsObjectPage
        },
        async: true
    });

    return runner;
});

