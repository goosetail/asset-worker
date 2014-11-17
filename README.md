Asset Worker
============

Asset Worker is a Node.js module for recursively finding asset files, and exporting them to a build directory of your project. It will also compile any Jade and Stylus files you may have. 

Getting Started
---------------

Grab Asset Worker from NPM.

	`npm install asset-worker`

And then setup your options.

	...
	var path = require('path');
	var nconf = require('nconf');


	// init assets
	var buildDir = path.join(__dirname, '.build');
	var clientDir = path.join(__dirname, 'client');

	assetWorker.setOptions({
		clientDir: clientDir,
		buildDir: buildDir,
		resourceRoot: nconf.get( 'app:resourceRoot' ),
		optimized: nconf.get( 'app:optimized' ),
		appVersion: require('../package.json').version
	});
