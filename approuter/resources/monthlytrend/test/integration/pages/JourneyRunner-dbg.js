sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"ns/monthlytrend/test/integration/pages/MonthlyKPIsList",
	"ns/monthlytrend/test/integration/pages/MonthlyKPIsObjectPage"
], function (JourneyRunner, MonthlyKPIsList, MonthlyKPIsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('ns/monthlytrend') + '/test/flp.html#app-preview',
        pages: {
			onTheMonthlyKPIsList: MonthlyKPIsList,
			onTheMonthlyKPIsObjectPage: MonthlyKPIsObjectPage
        },
        async: true
    });

    return runner;
});

