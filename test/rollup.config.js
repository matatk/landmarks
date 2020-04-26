export default [{
	input: 'src/code/contrastChecker.js',
	output: {
		file: 'test/generated-contrast-checker.js',
		format: 'cjs'
	}
}, {
	input: 'src/code/migrationManager.js',
	output: {
		file: 'test/generated-migration-manager.js',
		format: 'cjs'
	}
}, {
	input: 'src/code/landmarksFinder.js',
	output: {
		file: 'test/generated-landmarks-finder.js',
		format: 'cjs'
	}
}]