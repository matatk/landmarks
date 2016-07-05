module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);

	// Project configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		svg2png: {
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
					src: 'src/build/*.svg',
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
					src: 'src/build/*.svg',
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

	// As I can't seem to find a grunt package to actually do this...
	grunt.registerMultiTask('svg2png', 'Convert SVGs to PNGs via ImageMagick', function() {
		var path = require('path');
		var widths = this.data.options.widths;
		var conversionsDone = 0;

		this.files.forEach(function(f) {
			f.src.filter(function(filepath) {
				widths.forEach(function(width) {
					// Assume filename ends in '.svg'
					var baseFileName = path.basename(filepath).slice(0, -4);
					var options = {
						cmd: 'convert',
						stdio: 'inherit',
						args: [
							'-background',
							'transparent',
							'-resize',
							width + 'x' + width,
							filepath,
							f.dest + baseFileName + '-' + width + '.png'
						]
					};

					grunt.verbose.writeln('Conversion task:', options);

					grunt.util.spawn(options, function(error, result, code) {
						if (error) {
							grunt.log.error('convert exit code:', code);
							throw(error);
						} else {
							conversionsDone += 1;
							grunt.verbose.writeln(conversionsDone,
								'SVG to PNG conversions complete.');
						}
					});
				});
			});
		});
	});

	// The following task declarations are even more repetitive,
	// so declare them in a loop
	['firefox', 'chrome'].forEach(function(browser) {
		grunt.config.set('clean.' + browser, [
			'extension/' + browser
		]);

		grunt.config.set('mkdir.' + browser, {
			options: {
				create: ['extension/' + browser]
			}
		});

		grunt.config.set('json_merge.' + browser, {
			files: [{
				src: [
					'src/build/manifest.common.json',
					'src/build/manifest.' + browser + '.json'
				],
				dest: 'extension/' + browser + '/manifest.json'
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

		grunt.config.set('jshint.' + browser, [
			'extension/' + browser + '/*.js'
		]);

		grunt.registerTask(browser, [
			'clean:' + browser,
			'mkdir:' + browser,
			'svg2png:' + browser,
			'copy:' + browser,
			'json_merge:' + browser,
			'jshint:' + browser,
		]);
	});

	grunt.registerTask('default', [
		'chrome',
		'firefox'
	]);
};
