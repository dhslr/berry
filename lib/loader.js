/**
 * This class compiles and executes 
 * JavaScript code.
 *
 * @class Loader
 * @static
 **/
(function () {
	"use strict";
var vm = require("vm"),
	path = require("path"),
	fs = require("fs"),
	execute,
	_dirname,
	myRequire,
	ModuleMissingException;


//expose module 
exports.module = module;

// parse cmd line
(function () {
	// check if module has been executed from cmd line
	if (require.main === module && process.argv[2]) {
		fs.readFile(process.argv[2], function (err, data) {
			var args = process.argv.slice(0, 2);
			args = args.concat(process.argv.slice(3));
			args[1] = process.argv[2];
			if (err) throw err;
			execute(data.toString(), 
				path.basename(process.argv[2]), path.dirname(process.argv[2]), args);
		});
	}
})();

ModuleMissingException = function(msg, module) {
	this.message = msg;
	this.module = module;
};

// "override" require function
// TODO: when no JS extension 
// is given wrong file requests
// are sent.
myRequire = function (module) {
	var ret,
		new_module_path,
		module_filename;
	try {
		ret = require(module);
	} catch (error) {
		if (error.code === "MODULE_NOT_FOUND") {
			// When executed in VM, modules are not searched in 
			// cwd -> try to load it from there as well!
			new_module_path = path.resolve(_dirname, module);
			if (fs.existsSync(new_module_path) 	&& 
				path.dirname(new_module_path) !== module) {
				// second part in if clause prevents endless recursion
				return myRequire(new_module_path);
			} else {
				// TODO: just a hack
				module_filename = error.message.replace(/^Cannot find module \'/, "");
				module_filename = module_filename.replace(/\'$/, "");
				//tell parent that a module is missing
				process.send({error_code: error.code, module: module_filename});
				process.exit(1);
				//throw new ModuleMissingException(error.message, module_filename);
			}
		} else {
			console.log("Error loading module: " + module);
			console.log(error);
		}
	}
	return ret;
};


/**
 * This method compiles and executes the given code
 * with the Node.js vm module. It will send a message
 * to its parent process when there is a module missing 
 * while executing the code.
 * @param {String} code Code to be executed
 * @param {String} filename The name of the file
 * @param {String} dirname The working directory
 * [@param {Array} args cmd line parameter for the code to be executed]
 * @method execute
 **/
module.exports.execute = execute = function (code, filename, dirname, args) {
	var context,
		script,
		args = args || [];

	if (require.main !== module) {
		// Module was not executed from cmd line
		args = [process.argv[0], path.join(filename, dirname)].concat(args);
	} 

	_dirname = dirname;
	process.argv = args;

	context = vm.createContext({
		console: console,
		Buffer: Buffer,
		require: myRequire,
		process: process,
		__filename: filename,
		__dirname: dirname,
		module: module,
		setTimeout: setTimeout,
		clearInterval: clearInterval,
		clearTimeout: clearTimeout,
		setInterval: setInterval
	});
	context.global = context;
	script = vm.createScript(code);
	script.runInNewContext(context);
};
})();
