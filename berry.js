(function () {
    "use strict";
    var appool = require("appool"),
		restify = require("restify"),
		mkpath = require("mkpath"),
		path = require("path"),
		//appRunner = require("./lib/apprunner").createAppRunner(),
		_ = require("lodash"),
		exec = require("child_process").exec,
		http_server,
		run_handler,
		AppHandler,
		config = require("./config/default.js"),
		appHandler;


    try {
        mkpath.sync(config.sandbox_dir);
    } catch (err) {
        console.log(err);
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
        if (!_.isUndefined(child)) {
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

	run_handler = function (options) {
		return function (req, res, next) {
			var name = req.params.name;
			if (_.isUndefined(name)) {
				res.send(new restify.ResourceNotFoundError("No such App!"));
			} else {
				appHandler.run(name, options, function (err, pid) {
					if (err) {
						res.send(err);
					} else {
						res.send(201, { created: { name: name, path: "/running/" + pid, pid: pid } });
					}
				});
			}
			return next();
		};
	}

    http_server.post("/apps/:name/run", function (req, res, next) {
		return run_handler({debug: false})(req, res, next);
    });
    http_server.post("/apps/:name/debug", function (req, res, next) {
		return run_handler({debug: true})(req, res, next);
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
			handle_data,
			remove_child,
			update,
			child_cwd = path.join(process.cwd(), config.sandbox_dir, "/lib"),
			self = this;

        this.children = {};

        this.getRunningApps = function () {
            return running_apps;
        };
        /*
		remove_app = function (app_name) {
			delete _running_apps_res[app_name];
			running_apps = running_apps.filter(function (app) {
				return (app.name !== app_name);
			});
		};
		*/
        handle_data = function (child) {
            return function (data) {
                if (!_.isUndefined(data) && data.length > 0) {
                    child.data.push(data);
                    //TODO: better memory control
                    if (child.data.length > 10) {
                        child.data = [data];
                    }
                }
            };
        };
        remove_child = function (pid) {
            var child = self.children[pid];
            if (!_.isUndefined(child)) {
                child.removeAllListeners();
                delete self.children[child.pid];
                update();
            }
        };
        update = function () {
            running_apps = [];
            _.forEach(self.children, function (child) {
                if (child.running) {
                    running_apps.push({ "name": child.app.name, "pid": child.pid });
                }
            });
        };

        this.run = function (app_name, options, cb) {
            var child,
                cmd = "",
				options = options || {},
				app = appool.getApps()[app_name];
            if (!_.isUndefined(app)) {
                if (options.debug === true) {
                    cmd = "npm run-script " + app.name + " debug";
                } else {
                    cmd = "npm start " + app.name;
                }
                child = exec(cmd, { cwd: child_cwd },
                        function (err, stdout, stderr) {
                            //gets called when process terminates
                            //handle_data(child)(stdout);
                            //handle_data(child)(stderr);
                            child.running = false;
                            setTimeout(function () {
                                self.remove_child(child.pid);
                            }, 100000);
                            update();
                        });
                child.data = [];
                child.running = true;
                child.app = app;
                self.children[child.pid] = child;
                update();
                child.on("exit", function (code, signal) {
                    child.running = false;
                    update();
                });
                child.on("error", function (err) {
                    cb(err);
                });
                child.stdout.on("data", handle_data(child));
                child.stderr.on("data", handle_data(child));
                cb(null, child.pid);
            }
        };

            this.kill = function (pid) {
                var child = self.children[pid];
                if (!_.isUndefined(child)) {
                    child.kill();
                }
            };
        };
        appHandler = new AppHandler();
    })();
