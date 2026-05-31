sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"ns/brandoperator/test/integration/pages/BrandVsOperatorList",
	"ns/brandoperator/test/integration/pages/BrandVsOperatorObjectPage"
], function (JourneyRunner, BrandVsOperatorList, BrandVsOperatorObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('ns/brandoperator') + '/test/flp.html#app-preview',
        pages: {
			onTheBrandVsOperatorList: BrandVsOperatorList,
			onTheBrandVsOperatorObjectPage: BrandVsOperatorObjectPage
        },
        async: true
    });

    return runner;
});

