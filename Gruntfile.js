module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);

	const packageJSON = require('./package.json');
	const extName = packageJSON.name;
	const extVersion = packageJSON.version;

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
					cwd: 'src/assemble/',
					src: 'landmarks.svg',
					dest: '../../extension/chrome/'
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
					cwd: 'src/assemble/',
					src: 'landmarks.svg',
					dest: '../../extension/firefox/'
				}]
			}
		},

		jshint: {
			options: {
				jshintrc: true
			}
		}
	});

	// The following task declarations are even more repetitive,
	// so declare them in a loop
	['firefox', 'chrome'].forEach(function(browser) {
		grunt.config.set('clean.' + browser, [
			'extension/' + browser,
			zipFileName(browser)
		]);

		grunt.config.set('mkdir.' + browser, {
			options: {
				create: [
					'extension/' + browser,
				]
			}
		});

		grunt.config.set('json_merge.' + browser, {
			files: [{
				src: [
					'src/assemble/manifest.common.json',
					'src/assemble/manifest.' + browser + '.json'
				],
				dest: 'extension/' + browser + '/manifest.json'
			}]
		});

		grunt.config.set('replace.' + browser, {
			src: 'extension/' + browser + '/manifest.json',
			overwrite: true,
			replacements: [{
				from: '@version@',
				to: extVersion
			}]
		});

		grunt.config.set('copy.' + browser, {
			files: [{
				expand: true,
				cwd: 'src/static/',
				src: ['*.js', '*.html'],
				dest: 'extension/' + browser + '/'
			},{
				expand: true,
				cwd: 'src/static/',
				src: '_locales/**',
				dest: 'extension/' + browser + '/'
			}]
		});

		// For the background script, there are some Chrome-specific extras
		const background_includes = ['src/assemble/background.js'];
		if (browser === 'chrome') {
			background_includes.push('src/assemble/background.chrome.js');
		}
		grunt.config.set('concat.' + browser, {
			src: background_includes,
			dest: 'extension/' + browser + '/background.js'
		});

		grunt.config.set('jshint.' + browser, [
			'extension/' + browser + '/*.js'
		]);

		grunt.config.set('zip.' + browser, {
			cwd: 'extension/' + browser,
			src: 'extension/' + browser + '/**/*',
			dest: zipFileName(browser)
		});

		grunt.registerTask(browser, [
			'clean:' + browser,
			'mkdir:' + browser,
			'rasterize:' + browser,
			'copy:' + browser,
			'json_merge:' + browser,
			'replace:' + browser,
			'concat:' + browser,
			'jshint:' + browser,
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
