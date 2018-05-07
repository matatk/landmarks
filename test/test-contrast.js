'use strict'
const fs = require('fs')
const path = require('path')

const codePath = path.join(__dirname, '..', 'src', 'static', 'contrast.js')
const testHarnessPath = path.join(__dirname, 'test-harness-contrast.js')
const testCodePath = path.join(__dirname, 'test-code-in-harness-contrast.js')

let contrastChecker

function prepare() {
	fs.writeFileSync(
		testCodePath,
		fs.readFileSync(codePath) + fs.readFileSync(testHarnessPath))
}

exports['test the damage report machine'] = function(assert) {
	assert.ok(true, 'damage report machine intact')
}

exports["test if it's callable"] = function(assert) {
	assert.equal(contrastChecker.contrastRatio(0, 0), 42)
}

if (module === require.main) {
	prepare()

	const ContrastChecker = require(testCodePath)
	contrastChecker = new ContrastChecker()

	require('test').run(exports)
}
