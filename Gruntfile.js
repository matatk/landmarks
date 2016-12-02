const path = require('path');

module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);

	const packageJSON = require('./package.json');
	const extName = packageJSON.name;
	const extVersion = packageJSON.version;
	const builtExtensionsDir = 'build';
	const srcStaticDir = path.join('src', 'static');
	const srcAssembleDir = path.join('src', 'assemble');
	const pngCacheDir = 'cache';

	// Project configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		rasterize: {
			chrome: {
				options: {
					sizes: [
						{ width: 16 },  // Chrome  (favicon)
						{ width: 19 },  // Chrome  (toolbar)
						{ width: 32 },  // Chrome  (Windows) + Firefox (menu panel)
						{ width: 38 },  // Chrome  (tooblar x2)
						{ width: 48 },  // Both    (general)
						{ width: 128 }  // Chrome  (store)
					]
				},
				files: [{
					expand: true,
					cwd: srcAssembleDir,
					src: 'landmarks.svg',
					dest: path.join('..', '..', pngCacheDir)
				}]
			},
			firefox: {
				options: {
					sizes: [
						{ width: 18 },  // Firefox (toolbar)
						{ width: 32 },  // Firefox (menu panel) + Chrome (Windows)
						{ width: 36 },  // Firefox (toolbar x2)
						{ width: 48 },  // Both    (general)
						{ width: 64 },  // Firefox (menu panel x2)
						{ width: 96 }   // Firefox (general x2)
					]
				},
				files: [{
					expand: true,
					cwd: srcAssembleDir,
					src: 'landmarks.svg',
					dest: path.join('..', '..', pngCacheDir)
				}]
			}
		},

		clean: {
			cache: [pngCacheDir]
		}
	});

	// The following task declarations are even more repetitive,
	// so declare them in a loop
	['firefox', 'chrome'].forEach(function(browser) {
		grunt.config.set('clean.' + browser, [
			path.join(builtExtensionsDir, browser),
			zipFileName(browser)
		]);

		grunt.config.set('mkdir.' + browser, {
			options: {
				create: [
					path.join(builtExtensionsDir, browser),
				]
			}
		});

		grunt.config.set('json_merge.' + browser, {
			files: [{
				src: [
					path.join(srcAssembleDir, 'manifest.common.json'),
					path.join(srcAssembleDir, 'manifest.' + browser + '.json')
				],
				dest: path.join(builtExtensionsDir, browser, 'manifest.json')
			}]
		});

		grunt.config.set('replace.' + browser, {
			src: path.join(builtExtensionsDir, browser, 'manifest.json'),
			overwrite: true,
			replacements: [{
				from: '@version@',
				to: extVersion
			}]
		});

		grunt.config.set('copy.' + browser, {
			files: [{
				expand: true,
				cwd: srcStaticDir,
				src: ['*.js', '*.html', '*.css'],
				dest: path.join(builtExtensionsDir, browser)
			}, {
				expand: true,
				cwd: srcStaticDir,
				src: '_locales/**',
				dest: path.join(builtExtensionsDir, browser)
			}, {
				expand: true,
				cwd: pngCacheDir,
				src: '*.png',
				dest: path.join(builtExtensionsDir, browser)
			}]
		});

		// For the background script, there are some Chrome-specific extras
		const background_includes = [path.join(srcAssembleDir, 'background.js')];
		if (browser === 'chrome') {
			background_includes.push(path.join(srcAssembleDir, 'background.chrome.js'));
		}
		grunt.config.set('concat.' + browser, {
			src: background_includes,
			dest: path.join(builtExtensionsDir, browser, 'background.js')
		});

		grunt.config.set('eslint.' + browser, [
			path.join(builtExtensionsDir, browser, '/*.js')
		]);

		grunt.config.set('zip.' + browser, {
			cwd: path.join(builtExtensionsDir, browser),
			src: path.join(builtExtensionsDir, browser, '/**/*'),
			dest: zipFileName(browser)
		});

		grunt.registerTask(browser, [
			'clean:' + browser,
			'mkdir:' + browser,
			'newer:rasterize:' + browser,
			'copy:' + browser,
			'json_merge:' + browser,
			'replace:' + browser,
			'concat:' + browser,
			'eslint:' + browser,
			'zip:' + browser
		]);
	});

	grunt.registerTask('default', [
		'chrome',
		'firefox'
	]);

	function zipFileName(browser) {
		return extName + '-' + extVersion + '-' + browser + '.zip';
	}
};
