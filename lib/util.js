"use strict";

var fs = require( 'fs' );
var _ = require( 'underscore' );
var path = require( 'path' );

module.exports = {
	walk: walk
};

// recursively walk a directory and get all the files
function walk( dir, exts, done ) {

	var results = [];

	if ( typeof exts === 'string' ) {
		exts = [ exts ];
	}
	else if ( typeof exts === 'function' ) {
		done = exts;
		exts = null;
	}

	fs.readdir( dir, function( err, list ) {
		var i = 0;

		if ( err ) {
			return done( err );
		}

		function next() {
			var file = list[ i++ ];

			// complete
			if ( !file ) {
				return done( null, results );
			}

			file = dir + '/' + file;

			fs.stat( file, function( err, stat ) {
				if ( stat && stat.isDirectory() ) {
					walk( file, exts, function( err, res ) {
						results = results.concat( res );
						next();
					});
				}
				else {
					if ( !exts || _.contains( exts, path.extname( file ) ) ) {
						results.push( file );
					}
					next();
				}
			});
		}

		next();
	});
}