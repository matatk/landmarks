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

		copy: {
			firefox: {
				files: [{
					expand: true,
					cwd: 'src/static/',
					src: ['*.js', '*.html'],
					dest: 'extension/firefox/'
				}]
			},
			chrome: {
				files: [{
					expand: true,
					cwd: 'src/static/',
					src: ['*.js', '*.html'],
					dest: 'extension/chrome/'
				}]
			}
		},

		json_merge: {
			firefox: {
				files: {
					'extension/firefox/manifest.json': [
						'src/build/manifest.common.json',
						'src/build/manifest.firefox.json'
					]
				}
			},
			chrome: {
				files: {
					'extension/chrome/manifest.json': [
						'src/build/manifest.common.json',
						'src/build/manifest.chrome.json'
					]
				}
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

	grunt.registerTask('firefox', [
		'respimg:firefox',
		'copy:firefox',
		'json_merge:firefox',
		'clean:todo'
	]);

	grunt.registerTask('chrome', [
		'respimg:chrome',
		'copy:chrome',
		'json_merge:chrome',
		'clean:todo'
	]);

	grunt.registerTask('default', [
		'clean:built',
		'chrome',
		'firefox'
	]);
};
