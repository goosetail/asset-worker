"use strict";

var fs = require('fs');
var url = require('url');
var path = require('path');
var async = require('async');
var minimatch = require('minimatch');
var mkdirp = require('mkdirp');
var stylus = require('stylus');
var nib = require('nib');
var _ = require('underscore');
var util = require('./lib/util');

var config = {
	clientDir: '',
	buildDir: '',
	resourceRoot: '',
	appVersion: '',
	exclude: '',
	optimized: false
};

module.exports = {
	getPaths: getPaths,
	setOptions: setOptions
};

function setOptions(options) {
	_.extend(config, options);
}

function getPaths(page, req, done) {

	if (typeof req === 'function') {
		done = req;
		req = null;
	}

	var debug = !!(req && req.__debugFlag);

	if (!config.optimized || debug) {
		unoptimizedPaths(page, debug, done);
	}
	else {
		optimizedPaths(page, done);
	}
}

function unoptimizedPaths(page, debug, done) {

	var pagePath = path.join(config.clientDir, page);

	// define parallel jobs
	// this will return all the css and js files in a dir
	var parallel = {

		css: function(next) {
			findCSSPaths(pagePath, preparePathsForBrowser(debug, next));
		},

		js: function (next) {
			findJSPaths(pagePath, preparePathsForBrowser(debug, next));
		}
	};

	// run jobs
	async.parallel(parallel, done);

}

function optimizedPaths(page, done) {

	// get the root url for all client files
	var resourceRoot = _.template(config.resourceRoot)({ version: config.appVersion });

	done(null, {
		css: [ resourceRoot + '/css/' + page + '.min.css' ],
		js:  [ resourceRoot + '/js/' + page + '.min.js' ]
	});
}

function findCSSPaths(dir, done) {

	var publicCssPaths = [];

	// find all stylus or css files in the client path
	util.walk(dir, [ '.css', '.styl' ], function (err, results) {

		if (err) {
			return done(err);
		}

		async.each(results, function (filePath, next) {

			var cssPath = filePath.replace('.styl', '.css');

			// add to public file path array
			publicCssPaths.push(cssPath);

			// for stylus files we need to compile
			if (path.extname(filePath) === '.styl') {

				// grab the relative path from public root
				// then rejoin with build root
				cssPath = path.relative(config.clientDir, cssPath);
				cssPath = path.join(config.buildDir, cssPath);

				// grab the stylus content
				fs.readFile(filePath, 'utf8', function (err, str) {

					if (err) {
						return next(err);
					}

					// compile stylus to css and save to cssPath
					stylus(str)
						.set('filename', filePath)
						.use(nib())
						.render(function (err, css) {
							if (err) {
								return next(err);
							}

							mkdirp(path.dirname(cssPath), '0700', function (err) {
								if (err) {
									return next(err);
								}

								fs.writeFile(cssPath, css, 'utf8', next);
							});
						});

				});
			}
			else {
				next();
			}

		// return array of public paths
		}, function(err) {
			done(err, publicCssPaths);
		});
	});
}

// this will find all javascript files in the client directory
function findJSPaths(dir, done) {

	util.walk(dir, '.js', done);

}

// this sorts paths and gives them the right relative path
function preparePathsForBrowser(debug, done) {

	return function(err, paths) {

		if (err) {
			return done(err);
		}

		// minimatch matches a list of paths. The ! operator says we want all paths that are not in our excluded glob
		paths = minimatch.match(paths, "!" + config.exclude, {matchBase: true});

		var genJSPaths = [];
		var libJSPaths = [];

		_.each(paths, function (jsPath) {

			// for public path, only use the relative path from public root
			var pathname = path.relative(config.clientDir, jsPath);
			var parts = pathname.split(path.sep);

			if (debug) {
				pathname = url.format({
					pathname: pathname,
					query: {
						'__scriptdebug__': 'true'
					}
				});
			}

			// browser pathnames need to be absolute
			pathname = '/' + pathname;

			if (parts.length === 2) {
				genJSPaths.unshift(pathname);
			}
			else if (parts[ 1 ] === 'lib') {
				libJSPaths.push(pathname);
			}
			else {
				genJSPaths.push(pathname);
			}
		});

		// recombine paths in the right order
		done(null, libJSPaths.concat(genJSPaths));
	}

}