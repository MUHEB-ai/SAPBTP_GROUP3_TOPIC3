sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"ns/weekdaytrend/test/integration/pages/WeekdayKPIsList",
	"ns/weekdaytrend/test/integration/pages/WeekdayKPIsObjectPage"
], function (JourneyRunner, WeekdayKPIsList, WeekdayKPIsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('ns/weekdaytrend') + '/test/flp.html#app-preview',
        pages: {
			onTheWeekdayKPIsList: WeekdayKPIsList,
			onTheWeekdayKPIsObjectPage: WeekdayKPIsObjectPage
        },
        async: true
    });

    return runner;
});

