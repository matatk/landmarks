module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);

	// Project configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		respimg: {
			chrome: {
				options: {
					widths: [
						16,  // Chrome  (favicon)
						19,  // Chrome  (toolbar)
						32,  // Chrome  (Windows) + Firefox (menu panel)
						38,  // Chrome  (tooblar x2)
						48,  // Both    (general)
						128  // Chrome  (store)
					],
					optimize: false
				},
				files: [{
					expand: true,
					cwd: 'src/build/',
					src: ['*.svg'],
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
					],
					optimize: false
				},
				files: [{
					expand: true,
					cwd: 'src/build/',
					src: ['*.svg'],
					dest: 'extension/firefox/'
				}]
			}
		},

		clean: {
			built: [
				'extension/',
			],
			todo: [
				'extension/**/*.svg'  // TODO remove after image-gen sorted out
			]
		}
	});

	// The following task declarations are even more repetitive,
	// so declare them in a loop
	['firefox', 'chrome'].forEach(function(browser) {
		grunt.config.set('json_merge.' + browser, {
			files: [{
				dest: 'extension/' + browser + '/manifest.json',
				src: [
					'src/build/manifest.common.json',
					'src/build/manifest.' + browser + '.json'
				]
			}]
		});

		grunt.config.set('copy.' + browser, {
			files: [{
				expand: true,
				cwd: 'src/static/',
				src: ['*.js', '*.html'],
				dest: 'extension/' + browser + '/'
			}]
		});

		grunt.registerTask(browser, [
			'respimg:' + browser,
			'copy:' + browser,
			'json_merge:' + browser,
			'clean:todo'
		]);
	});

	grunt.registerTask('default', [
		'clean:built',
		'chrome',
		'firefox'
	]);
};
