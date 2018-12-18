'use strict'
const fs = require('fs')
const path = require('path')
const jsdom = require('jsdom')
const { JSDOM } = jsdom

const testCodePath = path.join(__dirname, 'test-code-in-harness-landmarks.js')
const fixturesDir = path.join(__dirname, 'landmarks-fixtures')
const expectationsDir = path.join(__dirname, 'landmarks-expectations')

// Tiny helper functions
const fixturePath = fileName => path.join(fixturesDir, fileName)
const expectationsPath = fileName => path.join(expectationsDir, fileName)

function createAllTests() {
	fs.readdirSync(fixturesDir).forEach(fixtureFile => {
		const testBaseName = path.basename(fixtureFile, '.html')
		const expectationFile = testBaseName + '.json'
		createTest(testBaseName, fixturePath(fixtureFile), expectationsPath(expectationFile))
	})
}

function createTest(testName, testFixture, testExpectations) {
	exports['test ' + testName] = function(assert) {
		const fixture = fs.readFileSync(testFixture)
		const expectation = require(testExpectations)
		const doc = new JSDOM(fixture).window.document
		const LandmarksFinder = require(testCodePath)
		const lf = new LandmarksFinder(doc.defaultView, doc)
		lf.find()
		assert.deepEqual(lf.filter(), expectation, testName)
	}
}

exports['test the damage report machine'] = function(assert) {
	assert.ok(true, 'damage report machine intact')
}

if (module === require.main) {
	createAllTests()
	require('test').run(exports)
}
