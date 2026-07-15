//@ui5-bundle ns/delaycausemonth/Component-preload.js
sap.ui.predefine("ns/delaycausemonth/Component", ["sap/fe/core/AppComponent"],function(e){"use strict";return e.extend("ns.delaycausemonth.Component",{metadata:{manifest:"json"}})});
sap.ui.require.preload({
	"ns/delaycausemonth/manifest.json":'{"_version":"1.48.0","sap.app":{"id":"ns.delaycausemonth","type":"application","title":"Delay Cause by Month","description":"Root-cause analysis by month","dataSources":{"mainService":{"uri":"/odata/v4/flight/","type":"OData","settings":{"odataVersion":"4.0"}}}},"sap.ui5":{"dependencies":{"minUI5Version":"1.120.0","libs":{"sap.m":{},"sap.fe.templates":{}}},"models":{"":{"dataSource":"mainService","preload":true,"settings":{"operationMode":"Server","autoExpandSelect":true,"earlyRequests":true}}},"routing":{"routes":[{"pattern":":?query:","name":"DelayCauseByMonthList","target":"DelayCauseByMonthList"}],"targets":{"DelayCauseByMonthList":{"type":"Component","id":"DelayCauseByMonthList","name":"sap.fe.templates.ListReport","options":{"settings":{"entitySet":"DelayCauseByMonth","initialLoad":"Enabled"}}}}},"flexBundle":false}}'
});
//# sourceMappingURL=Component-preload.js.map
