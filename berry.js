(function () {
	"use strict";
	var appool = require("appool"),
		restify = require("restify"),
		mkpath = require("mkpath"),
		appRunner = require("./lib/apprunner").createAppRunner(),
		http_server,
		AppHandler,
		config = require("./config/default.js"),
		appHandler;
		
	try {
		process.chdir(config.sandbox_dir);
	} catch (err) {
		if (err.code === "ENOENT") {
			mkpath.sync(config.sandbox_dir); 
			process.chdir(config.sandbox_dir);
		} else {
			console.log(err);
			process.exit(1);
		}
	}
	appool.setPrefix(config.sandbox_dir);
	http_server = appool.getServer();
	exports.close = appool.close;
	exports.listen = appool.listen;
	exports.getApps = appool.getApps;
	exports.address = function () {
		return appool.address();
	};

	http_server.get("/running", function (req, res, next) {
		res.send(appHandler.getRunningApps());
		return next();
	});

	/*
	http_server.get("/apps/:name/show", function (req, res, next) {
		//redirect to /apps/:name
		res.writeHead(302, {
			  "Location": "/apps/" + req.params.name
		});
		res.end();
		return next();
	});
	*/
	http_server.get("/running/:pid", function (req, res, next) {
		var child = appHandler.children[req.params.pid];
		if (typeof child !== "undefined") {
			child.data.forEach(function (buffer) {
				res.write(buffer.toString());
			});
			child.stdout.on("data", function (data) {
				res.write(data);
			});
			child.stderr.on("data", function (data) {
				res.write(data);
			});
			child.on("error", function (err) {
				res.write(err);
				res.end();
			});
			child.on("exit", function (code, signal) {
				//res.write("process exited " + code);
				res.end();
			});
		} else {
			res.send(new restify.ResourceNotFoundError("No process found with pid " + req.params.pid));
		}
		return next();
	});
	http_server.post("/apps/:name/run", function (req, res, next) {
		var name = req.params.name;
		console.log(req.params);
		if (typeof name  === "undefined") {
			res.send(new restify.ResourceNotFoundError("No such App!"));
		} else {
			appHandler.run(name, function (err, pid) {
				if (err) {
					res.send(err);
				} else {
					res.send(201, {created: {name: name, path: "/running/" + pid, pid: pid}});
				}
			});
		}
		return next();
	});

	http_server.del("/running/:pid", function (req, res, next) {
		var pid = Number(req.params.pid);
		if (!Number.isNaN(pid)) {
			appHandler.kill(pid);
			res.send(204);
		} else {
			res.send(new restify.InvalidArgumentError("Malformed PID!"));
		}
		return next();
	});

	AppHandler = function () {
		var remove_app,
			running_apps = [],
			_running_apps_res = {},
			self = this;

		this.children = {};

		this.getRunningApps = function () {
			return appRunner.getRunning();
		};
		/*
		remove_app = function (app_name) {
			delete _running_apps_res[app_name];
			running_apps = running_apps.filter(function (app) {
				return (app.name !== app_name);
			});
		};
		*/
		this.run = function (app_name, cb) {
			var child,
				app = appool.getApps()[app_name];
			//console.log(app);
			if (typeof app !== "undefined") {
				child = appRunner.run({
					dir: app.path,
					filename: app.main,
					name: app.name
				});
				child.data = [];
				child.on("executed", function (pid) {
					if (typeof cb === "function") {
						cb(null, pid);
					}
					self.children[pid] = child;
					child.pid = pid;
					child.stdout.on("data", function (data) {
						child.data.push(data);
						//TODO: better memory control
						if (child.data.length > 10) {
							child.data = [data];
						}
					});
				});
				child.on("exit", function (signal ,code) {
					//TODO: wait 100 sec until ressource gets deleted!?
					setTimeout(function () {
						delete self.children[child.pid];
					}, 100000);
				});
				child.on("error", function (err) {
					if (typeof cb === "function") {
						cb(err);
					}
					console.log(err);
					delete self.children[child.pid];
				});
			} else {
				if (typeof cb === "function") {
					cb(new restify.ResourceNotFoundError("App " + app_name +
								" does not exist!"));
				}
			}
		};
		this.kill = function (pid) {
			appRunner.kill(pid);
		};
	};
	appHandler = new AppHandler();
})();
