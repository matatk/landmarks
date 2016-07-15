module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);

	const packageJSON = require('./package.json');
	const extName = packageJSON.name;
	const extVersion = packageJSON.version;
	const extFileNameZip = extName + '-' + extVersion + '.zip';

	// Project configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		magick_svg2png: {
			chrome: {
				options: {
					widths: [
						16,  // Chrome  (favicon)
						19,  // Chrome  (toolbar)
						32,  // Chrome  (Windows) + Firefox (menu panel)
						38,  // Chrome  (tooblar x2)
						48,  // Both    (general)
						128  // Chrome  (store)
					]
				},
				files: [{
					src: 'src/assemble/*.svg',
					dest: 'extension/chrome/'
				}]
			},
			firefox: {
				options: {
					widths: [
						18,  // Firefox (toolbar)
						32,  // Firefox (menu panel) + Chrome (Windows)
						36,  // Firefox (toolbar x2)
						48,  // Both    (general)
						64,  // Firefox (menu panel x2)
						96   // Firefox (general x2)
					]
				},
				files: [{
					src: 'src/assemble/*.svg',
					dest: 'extension/firefox/'
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
			'build/' + browser
		]);

		grunt.config.set('mkdir.' + browser, {
			options: {
				create: [
					'extension/' + browser,
					'build/' + browser
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

		grunt.config.set('jshint.' + browser, [
			'extension/' + browser + '/*.js'
		]);

		grunt.config.set('zip.' + browser, {
			cwd: 'extension/' + browser,
			src: 'extension/' + browser + '/*',
			dest: 'build/' + browser + '/' + extFileNameZip
		});

		grunt.registerTask(browser, [
			'clean:' + browser,
			'mkdir:' + browser,
			'magick_svg2png:' + browser,
			'copy:' + browser,
			'json_merge:' + browser,
			'replace:' + browser,
			'jshint:' + browser,
			'zip:' + browser
		]);
	});

	grunt.registerTask('default', [
		'chrome',
		'firefox'
	]);
};
