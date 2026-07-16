//@ui5-bundle ns/delaybyduration/Component-preload.js
sap.ui.predefine("ns/delaybyduration/Component", ["sap/fe/core/AppComponent"],function(e){"use strict";return e.extend("ns.delaybyduration.Component",{metadata:{manifest:"json"}})});
sap.ui.require.preload({
	"ns/delaybyduration/manifest.json":'{"_version":"1.48.0","sap.app":{"id":"ns.delaybyduration","type":"application","title":"Delay by Flight Duration","description":"Delay behavior by haul length","dataSources":{"mainService":{"uri":"/odata/v4/flight/","type":"OData","settings":{"odataVersion":"4.0"}}}},"sap.ui5":{"dependencies":{"minUI5Version":"1.120.0","libs":{"sap.m":{},"sap.fe.templates":{}}},"models":{"":{"dataSource":"mainService","preload":true,"settings":{"operationMode":"Server","autoExpandSelect":true,"earlyRequests":true}}},"routing":{"routes":[{"pattern":":?query:","name":"DelayByDurationList","target":"DelayByDurationList"}],"targets":{"DelayByDurationList":{"type":"Component","id":"DelayByDurationList","name":"sap.fe.templates.ListReport","options":{"settings":{"entitySet":"DelayByDuration","initialLoad":"Enabled"}}}}},"flexBundle":false}}'
});
//# sourceMappingURL=Component-preload.js.map
