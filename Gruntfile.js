module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);

	// Project configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		respimg: {
			default: {
				options: {
					widths: [
						16,  // Chrome  (favicon)
						18,  // Firefox (toolbar)
						19,  // Chrome  (toolbar)
						32,  // Firefox (menu panel)
						     // Chrome  (Windows)
						36,  // Firefox (toolbar x2)
						38,  // Chrome  (tooblar x2)
						48,  // Both    (general)
						64,  // Firefox (menu panel x2)
						96,  // Firefox (general x2)
						128  // Chrome  (store)
					],
					optimize: false
				},
				files: [{
					expand: true,
					cwd: 'src/',
					src: ['**.svg'],
					dest: 'extension/'
				}]
			}
		},

		clean: {
			png: [
				"extension/*.png",
			],
			todo: [
				"extension/*.svg"  // TODO remove after image-gen sorted out
			]
		}
	});

	grunt.registerTask('default', ['respimg', 'clean:todo']);
};
