'use strict'
const fs = require('fs')
const path = require('path')
const jsdom = require('jsdom')
const { JSDOM } = jsdom

const testCodePath = path.join(__dirname, 'test-code-in-harness-landmarks.js')
const fixturesDir = path.join(__dirname, 'fixtures')
const dataDir = path.join(__dirname, 'data')

const testSuiteFormatExample = {
	'expected': [
		{
			'type': 'landmark',
			'role': 'banner',
			'label': null,
			'selector': 'body > header',
			'contains': [
				{
					'type': 'landmark',
					'role': 'navigation',
					'label': 'World of wombats',
					'selector': 'body > header > nav'
				}
			]
		},
		{
			'type': 'landmark',
			'role': 'main',
			'label': 'Looking after your wombat',
			'selector': 'body > main',
			'contains': [
				{
					'type': 'landmark',
					'role': 'navigation',
					'label': 'Looking after your wombat Topics',
					'selector': 'body > main > nav:nth-child(2)'
				}
			]
		},
		{
			'type': 'landmark',
			'role': 'contentinfo',
			'label': null,
			'selector': 'body > footer'
		}
	]
}

const landmarksFormatExample = {
	'expected': [
		{
			'depth': 0,
			'role': 'banner',
			'label': null,
			'selector': 'body > header'
		},
		{
			'depth': 1,
			'role': 'navigation',
			'label': 'World of wombats',
			'selector': 'body > header > nav'
		},
		{
			'depth': 0,
			'role': 'main',
			'label': 'Looking after your wombat',
			'selector': 'body > main'
		},
		{
			'depth': 1,
			'role': 'navigation',
			'label': 'Looking after your wombat Topics',
			'selector': 'body > main > nav:nth-child(2)'
		},
		{
			'depth': 0,
			'role': 'contentinfo',
			'label': null,
			'selector': 'body > footer'
		}
	]
}

// Tiny helper functions
const fixturePath = fileName => path.join(fixturesDir, fileName)
const dataPath = fileName => path.join(dataDir, fileName)

function convertCore(landmarksFormatData, testSuiteFormatData, depth) {
	for (const landmark of testSuiteFormatData) {
		landmarksFormatData.push({
			'depth': depth,
			'role': landmark.role,
			'label': landmark.label,
			'selector': landmark.selector
		})
		if (landmark.contains) {
			convertCore(landmarksFormatData, landmark.contains, depth + 1)
		}
	}
}

function convertToLandmarksFormat(testSuiteFormatData) {
	const landmarksFormatData = []
	convertCore(landmarksFormatData, testSuiteFormatData, 0)
	return landmarksFormatData
}

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
		assert.deepEqual(
			lf.allDepthsRolesLabelsSelectors(),
			convertToLandmarksFormat(data.expected),
			testName)
	}
}

exports['test the damage report machine'] = function(assert) {
	assert.ok(true, 'damage report machine intact')
}

exports['test conversion of Landmarks format results'] = function(assert) {
	assert.deepEqual(
		convertToLandmarksFormat(testSuiteFormatExample.expected),
		landmarksFormatExample.expected,
		'test data format conversion OK')
}

if (module === require.main) {
	createAllTests()
	require('test').run(exports)
}
