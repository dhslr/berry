(function () {
	"use strict";
	var appRunner = require("../apprunner.js").createAppRunner(),
		path = require("path"),
		fs = require("fs"),
		code = new Buffer("console.log(\"Test\");"),
		test_app_obj1,
		should_not_happen,
		filename = "./apprunner_test_file.js";

	should_not_happen = function (app, test) {
		app.on("exit", function (signal, code) {
			console.log(signal);
			console.log(code);
			test.ok(false);
		});
		app.on("data", function (data) {
			console.log(data);
			test.ok(false);
		});
	};

	exports.setUp = function (cb) {
		test_app_obj1 = {
			filename: path.basename(filename),
			dir: path.dirname(filename)
		};
		fs.writeFile(filename, code, function (err) {
			if (err) {
				console.log(err);
				throw err;
			}
			cb();
		});
	};

	exports.tearDown = function (cb) {
		fs.unlinkSync(filename);
		cb();
	};


	exports.test_normal_run = function (test) {
		var app1,
			pid;
		app1 = appRunner.run(test_app_obj1);
		app1.on("executed", function (pid) {
			test.ok(pid);
			app1.pid = pid;
		});
		app1.on("data", function (data) {
			console.log("Data: ");
			console.log(data.toString());
			test.equals("Test\n", data.toString());
			appRunner.kill(app1.pid);
		});
		app1.on("error", function (error) {
			// should not happen
			console.log(error);
			test.ok(false);
		});
		app1.on("exit", function (signal, code) {
			console.log("Exit: sig " + signal + ", code " + code);
			test.done();
		});
	};


	exports.test_wrong_hash = function (test) {
		var app1;
		// wrong fake hash
		test_app_obj1.hash = "212313ji";
		app1 = appRunner.run(test_app_obj1);
		app1.on("error", function (error) {
			// should happen
			test.equal(error.code, "WRONG_HASH");
			test.equal(error.app.filename, test_app_obj1.filename);
			test.equal(error.app.dir, test_app_obj1.dir);
			test.done();
		});
		should_not_happen(app1, test);
	};

	exports.test_file_not_found = function (test) {
		var app1;
		test_app_obj1.filename = "_should_not_exist__";
		app1 = appRunner.run(test_app_obj1);
		app1.on("error", function (error) {
			test.equal(error.code, "FILE_NOT_FOUND");
			test.equal(error.app.filename, test_app_obj1.filename);
			test.equal(error.app.dir, test_app_obj1.dir);
			test.done();
		});

		should_not_happen(app1, test);
	};

	exports.test_module_not_found = function (test) {
		var app1,
			new_filename;
		test_app_obj1.filename = "apprunner_module_not_found.js";
		new_filename = path.join(test_app_obj1.dir, test_app_obj1.filename);
		fs.writeFileSync(new_filename, 
				new Buffer("var a = require(\"./_not_there.js\");"));
		app1 = appRunner.run(test_app_obj1);
		app1.on("error", function (error) {
			test.equal(error.code, "MODULE_NOT_FOUND");
			test.equal(error.app.filename, test_app_obj1.filename);
			test.equal(error.app.dir, test_app_obj1.dir);
			fs.unlinkSync(new_filename);
			test.done();
		});
		should_not_happen(app1, test);
	};

})();
