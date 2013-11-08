#!/usr/bin/env node
(function () {
	"use strict";
	var berry = require("./berry.js"),
		discovery = require("utilities").discovery_provider.createDefaultProvider(),
		url = require("url");
	if (require.main === module) {
		var port = process.argv[2] || 8081;
		berry.listen(port, function (uri) {
			var parsed = url.parse(uri);
			console.log("Started! Listening on " + uri);
			discovery.createAdvertisement(Number(parsed.port), "berry"); 
			discovery.startAdvertising();
		});
	}
})();
