//@ui5-bundle ns/delayseverity/Component-preload.js
sap.ui.predefine("ns/delayseverity/Component", ["sap/fe/core/AppComponent"],function(e){"use strict";return e.extend("ns.delayseverity.Component",{metadata:{manifest:"json"}})});
sap.ui.require.preload({
	"ns/delayseverity/manifest.json":'{"_version":"1.48.0","sap.app":{"id":"ns.delayseverity","type":"application","title":"Delay Severity","description":"Flight Delay Severity Distribution","dataSources":{"mainService":{"uri":"/odata/v4/flight/","type":"OData","settings":{"odataVersion":"4.0"}}}},"sap.ui5":{"dependencies":{"minUI5Version":"1.120.0","libs":{"sap.m":{},"sap.fe.templates":{}}},"models":{"":{"dataSource":"mainService","preload":true,"settings":{"operationMode":"Server","autoExpandSelect":true,"earlyRequests":true}}},"routing":{"routes":[{"pattern":":?query:","name":"DelaySeverityList","target":"DelaySeverityList"}],"targets":{"DelaySeverityList":{"type":"Component","id":"DelaySeverityList","name":"sap.fe.templates.ListReport","options":{"settings":{"entitySet":"FlightDelayClassification","initialLoad":"Enabled"}}}}},"flexBundle":false}}'
});
//# sourceMappingURL=Component-preload.js.map
