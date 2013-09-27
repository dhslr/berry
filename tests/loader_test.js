(function () {
	"use strict";
	var loader = require("../loader.js"),
		BADCODE = "./loader_test_bad_code.js_",
		GOODCODE = "./loader_test_good_code.js_",
		path = require("path"),
		fs = require("fs"),
		exe_helper;

	exe_helper = function (filename) {
		var code = fs.readFileSync(filename);
		loader.execute(code.toString(), 
			path.basename(filename), path.dirname(filename));
	};

	exports.execute_test = function (test) {
		test.throws(function () {
			exe_helper(BADCODE);
		});
		test.doesNotThrow(function () {
			exe_helper(GOODCODE);
		});
		test.done();
	};
})();
