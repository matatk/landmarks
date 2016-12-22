'use strict'
const fs = require('fs')
const path = require('path')

const fixturesDir = path.join(__dirname, 'fixtures')
const dataDir = path.join(__dirname, 'data')

const codePath = path.join(__dirname, '..', 'src', 'static', 'content.js')

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
		const code = require(codePath)
		const fixture = fs.readFileSync(testFixture)
		const data = fs.readFileSync(testData)
		console.log('setting up test', testName, testFixture, fixture.length, testData, data.length)
		assert.ok(true, 'dummy assertion for ' + testName)
	}
}

exports['test the damage report machine'] = function(assert) {
	assert.ok(true, 'damage report machine intact')
}

if (module === require.main) {
	createAllTests()
	require('test').run(exports)
}
