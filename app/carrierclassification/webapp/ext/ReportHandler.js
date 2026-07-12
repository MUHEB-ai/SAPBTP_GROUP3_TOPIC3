sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (MessageToast, MessageBox) {
    "use strict";
    return {
        generateReport: function (oBindingContext, aSelectedContexts) {
            var oContext = (aSelectedContexts && aSelectedContexts.length) ? aSelectedContexts[0] : oBindingContext;
            if (!oContext) { MessageBox.warning("Please select a carrier row first."); return; }
            var sAirline = oContext.getProperty("Airline");
            MessageToast.show("Generating report for " + sAirline + " ...");
            fetch("/odata/v4/flight/generateCarrierReport", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ airline: sAirline })
            })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (!data || !data.value) { MessageBox.error("Report generation failed."); return; }
                var aBytes = atob(data.value);
                var aBuffer = new Uint8Array(aBytes.length);
                for (var i = 0; i < aBytes.length; i++) { aBuffer[i] = aBytes.charCodeAt(i); }
                var oBlob = new Blob([aBuffer], { type: "application/pdf" });
                var sUrl = URL.createObjectURL(oBlob);
                var oLink = document.createElement("a");
                oLink.href = sUrl;
                oLink.download = "Carrier_Report_" + sAirline + ".pdf";
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                URL.revokeObjectURL(sUrl);
                MessageToast.show("Report downloaded.");
            })
            .catch(function (err) { MessageBox.error("Error: " + err.message); });
        }
    };
});