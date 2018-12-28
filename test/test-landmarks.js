'use strict'
const fs = require('fs')
const path = require('path')
const jsdom = require('jsdom')
const { JSDOM } = jsdom

const testCodePath = path.join(__dirname, 'test-code-in-harness-landmarks.js')
const fixturesDir = path.join(__dirname, 'fixtures')
const dataDir = path.join(__dirname, 'data')

// Tiny helper functions
const fixturePath = fileName => path.join(fixturesDir, fileName)
const dataPath = fileName => path.join(dataDir, fileName)

function createAllTests() {
	const htmlFiles = fs.readdirSync(fixturesDir)

	htmlFiles.forEach(htmlFile => {
		const testBaseName = path.basename(htmlFile, '.html')
		const jsonFile = testBaseName + '.json'
		createTest(testBaseName, fixturePath(htmlFile), dataPath(jsonFile))
	})
}

function createTest(testName, testFixture, testData) {
	exports['test ' + testName] = function(assert) {
		const fixture = fs.readFileSync(testFixture)
		const data = require(testData)
		const doc = new JSDOM(fixture).window.document
		const LandmarksFinder = require(testCodePath)
		const lf = new LandmarksFinder(doc.defaultView, doc)
		lf.find()
		assert.deepEqual(lf.filter(), data.expected, testName)
	}
}

exports['test the damage report machine'] = function(assert) {
	assert.ok(true, 'damage report machine intact')
}

if (module === require.main) {
	createAllTests()
	require('test').run(exports)
}
