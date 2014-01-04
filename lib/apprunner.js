(function () {
	"use strict"; 

	var AppRunner = function () {
	var		events = require("events"),
			path = require("path"),
			fork = require("child_process").fork,
			fs = require("fs"),
			crypto = require("crypto"),
			loader = require("./loader.js"),
			_ = require("lodash"),
			create_child,
			create_child_exit_handler,
			create_child_message_handler,
			children_map,
			hash_algorithm = "sha512",
			hash_encoding = "base64",
			execute;

		// map for child processes
		children_map = {};

		create_child_message_handler = function (app, child) {
			return function (msg) {
				var error;
				if (msg.error_code && msg.error_code === "MODULE_NOT_FOUND") {
					error = new Error("Module not found!");
					error.code = msg.error_code;
					error.app = app;
					child.emitter.emit("error", error);
				}
				delete children_map[child.pid];
			};
		};

		create_child_exit_handler = function (app, child) {
			return function (code, signal) {
				console.log(path.join(app.dir, app.filename) +
						" has been exited with signal " + signal +
						" and exit code: " + code);
				child.emitter.emit("exit", signal, code);
				delete children_map[child.pid];
			};
		};

		create_child = function (app) {
			var filepath = path.join(app.dir, app.filename),
				child,
				args = [filepath];
			args = args.concat(app.args);
			child = fork(loader.module.filename, args, {silent: true});
			child.on("message", 
				create_child_message_handler(app, child)); 
			child.on("exit", 
				create_child_exit_handler(app, child));
			return child;
		};
		
		this.getRunning = function () {
			var running = [];
			_.forEach(children_map, function (child, pid) {
				running.push({name: child.app.name, pid: pid});
			});
			return running;
		};

		this.kill = function (pid) {
			var child = children_map[pid];
			if (typeof child !== "undefined") {
				child.kill();
			} else {
				console.log("No child process found with pid: %j", pid);
			}
		};

		execute = function (app, emitter) {
			var child = create_child(app);
			child.app = app;
			child.emitter = emitter;
			child.emitter.stdout = child.stdout;
			child.emitter.stderr = child.stderr;
			emitter.emit("executed", child.pid);
			children_map[child.pid] = child;
		};

		this.run = function (app) {
			var filepath,
				emitter = new events.EventEmitter();

			filepath = path.join(app.dir, app.filename);
			console.log(filepath);
			// adding sandbox prefix
			//fs.readFile(path.join(process.cwd(), filepath), function (err, data) {
			fs.readFile(filepath, function (err, data) {
				var shasum = crypto.createHash(hash_algorithm),
					error;
				if (!err) {
					if (!_.isUndefined(app.hash)) {
						shasum.update(data);
						if (shasum.digest(hash_encoding) === app.hash) {
							execute(app, emitter);
							// Executed!
							} else {
								// Wrong hash: Send File Transfer Request 
								error = new Error("Wrong Hash");
								error.code = "WRONG_HASH";
								error.app = app;
								emitter.emit("error", error);
							}
					} else {
						// no hash given, just try to execute!
						execute(app, emitter);
					}
				} else {
					console.log(filepath);
					error = new Error("File not found!");
					error.code = "FILE_NOT_FOUND";
					error.app = app;
					emitter.emit("error", error);
				}
			});
			return emitter;
		};
	};

	exports.createAppRunner = function () {
		return new AppRunner();
	};
})();
