'use strict'
const fs = require('fs')
const path = require('path')
const jsdom = require('jsdom')
const { JSDOM } = jsdom

const testCodePath = path.join(__dirname, '..', 'scripts', 'html-to-json.js')
const fixturesDir = path.join(__dirname, 'html-to-json-fixtures')
const expectationsDir = path.join(__dirname, 'html-to-json-expectations')

// Tiny helper functions
const fixturePath = fileName => path.join(fixturesDir, fileName)
const expectationPath = fileName => path.join(expectationsDir, fileName)

function createAllTests() {
	fs.readdirSync(fixturesDir).forEach(fixtureFile => {
		const testBaseName = path.basename(fixtureFile, '.html')
		const expectationFile = testBaseName + '.json'
		createTest(testBaseName, fixturePath(fixtureFile), expectationPath(expectationFile))
	})
}

function createTest(testName, testFixture, testExpectation) {
	exports['test ' + testName] = function(assert) {
		const fixture = fs.readFileSync(testFixture)
		const expectation = require(testExpectation)
		const doc = new JSDOM(fixture).window.document

		const convert = require(testCodePath)
		const res = convert(
			doc.defaultView,
			doc.getElementById('test-container'),
			null)

		assert.deepEqual(res, expectation, testName)
	}
}

exports['test the damage report machine'] = function(assert) {
	assert.ok(true, 'HTML to JSON damage report machine intact')
}

if (module === require.main) {
	createAllTests()
	require('test').run(exports)
}
