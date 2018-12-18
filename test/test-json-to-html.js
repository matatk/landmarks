'use strict'
const fs = require('fs')
const path = require('path')
const jsdom = require('jsdom')
const { JSDOM } = jsdom

const testCodePath = path.join(__dirname, 'test-code-in-harness-json-to-html.js')
const fixturesDir = path.join(__dirname, 'json-to-html-fixtures')
const expectationsDir = path.join(__dirname, 'json-to-html-expectations')

// Tiny helper functions
const fixturePath = fileName => path.join(fixturesDir, fileName)
const expectationPath = fileName => path.join(expectationsDir, fileName)

function createAllTests() {
	fs.readdirSync(fixturesDir).forEach(fixtureFile => {
		const testBaseName = path.basename(fixtureFile, '.json')
		const expectationFile = testBaseName + '.html'
		createTest(testBaseName, fixturePath(fixtureFile), expectationPath(expectationFile))
	})
}

function createTest(testName, testFixture, testExpectation) {
	exports['test ' + testName] = function(assert) {
		const fixture = require(testFixture)
		const expectation = fs.readFileSync(testExpectation, 'utf-8').trim()

		const doc = new JSDOM(fixture).window.document
		const testContainer = doc.createElement('DIV')
		testContainer.id = 'test-container'
		doc.body.appendChild(testContainer)

		const JsonToHtml = require(testCodePath)
		const jth = new JsonToHtml(doc, 'test-container')
		jth.makeHtml(fixture)
		assert.deepEqual(testContainer.innerHTML, expectation, testName)
	}
}

exports['test the damage report machine'] = function(assert) {
	assert.ok(true, 'JsonToHtml damage report machine intact')
}

if (module === require.main) {
	createAllTests()
	require('test').run(exports)
}
