export default [{
	input: 'src/code/contrastChecker.js',
	output: {
		file: 'test/generated-contrast-checker.js',
		format: 'cjs',
		exports: 'default'
	}
}, {
	input: 'src/code/migrationManager.js',
	output: {
		file: 'test/generated-migration-manager.js',
		format: 'cjs',
		exports: 'default'
	}
}, {
	input: 'src/code/landmarksFinder.js',
	output: {
		file: 'test/generated-landmarks-finder.js',
		format: 'cjs',
		exports: 'default'
	}
}, {
	input: 'src/code/landmarksCounter.js',
	output: {
		file: 'test/generated-landmarks-counter.js',
		format: 'cjs',
		exports: 'default'
	}
}]
