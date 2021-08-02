import path from 'path'
import { fileURLToPath } from 'url'

import test from 'ava'
import jsdom from 'jsdom'
import pssst from 'page-structural-semantics-scanner-tests'
import LandmarksFinderStandard from '../src/code/landmarksFinderStandard.js'
import LandmarksFinderDeveloper from '../src/code/landmarksFinderDeveloper.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const { JSDOM } = jsdom
const strictChecks = pssst.getFullPageTestsInline()
const heuristicChecks = pssst.getFullPageTestsInlineFrom(
	path.join(dirname, 'heuristics', 'fixtures'),
	path.join(dirname, 'heuristics', 'expectations'))

const testSuiteFormatExpectation = [
	{
		'type': 'landmark',
		'role': 'banner',
		'roleDescription': null,
		'label': null,
		'selector': 'body > header',
		'contains': [
			{
				'type': 'landmark',
				'role': 'navigation',
				'roleDescription': null,
				'label': 'World of wombats',
				'selector': 'body > header > nav'
			}
		]
	},
	{
		'type': 'landmark',
		'role': 'main',
		'roleDescription': null,
		'label': 'Looking after your wombat',
		'selector': 'body > main',
		'contains': [
			{
				'type': 'landmark',
				'role': 'navigation',
				'roleDescription': null,
				'label': 'Looking after your wombat Topics',
				'selector': 'body > main > nav:nth-child(2)'
			}
		]
	},
	{
		'type': 'landmark',
		'role': 'contentinfo',
		'roleDescription': null,
		'label': null,
		'selector': 'body > footer'
	}
]

const landmarksFormatExpectation = [
	{
		'depth': 0,
		'role': 'banner',
		'roleDescription': null,
		'label': null,
		'selector': 'body > header',
		'guessed': false
	},
	{
		'depth': 1,
		'role': 'navigation',
		'roleDescription': null,
		'label': 'World of wombats',
		'selector': 'body > header > nav',
		'guessed': false
	},
	{
		'depth': 0,
		'role': 'main',
		'roleDescription': null,
		'label': 'Looking after your wombat',
		'selector': 'body > main',
		'guessed': false
	},
	{
		'depth': 1,
		'role': 'navigation',
		'roleDescription': null,
		'label': 'Looking after your wombat Topics',
		'selector': 'body > main > nav:nth-child(2)',
		'guessed': false
	},
	{
		'depth': 0,
		'role': 'contentinfo',
		'roleDescription': null,
		'label': null,
		'selector': 'body > footer',
		'guessed': false
	}
]

const testSuiteFormatExpectationWithGuesses = [
	{
		'type': 'landmark',
		'role': 'main',
		'roleDescription': null,
		'label': null,
		'selector': '#main',
		'guessed': true
	}
]

const landmarksFormatExpectationWithGuesses = [
	{
		'depth': 0,
		'role': 'main',
		'roleDescription': null,
		'label': null,
		'selector': '#main',
		'guessed': true
	}
]


//
// Check the damage report machine
//

test('expectation conversion from test suite to Landmarks format', t => {
	t.deepEqual(
		convertExpectation(testSuiteFormatExpectation),
		landmarksFormatExpectation)
})

test('expectation conversion from test suite to Landmarks format ' +
	'(with heuristics)', t => {
	t.deepEqual(
		convertExpectation(testSuiteFormatExpectationWithGuesses),
		landmarksFormatExpectationWithGuesses)
})


//
// Check the LandmarksFinders
//

function testSpecificLandmarksFinder(
	runName, Scanner, postProcesor, checks, heuristics) {
	for (const check of Object.values(checks)) {
		test(runName + ': ' + check.meta.name, t => {
			const dom = new JSDOM(check.fixture)
			const lf = new Scanner(dom.window, dom.window.document, heuristics)
			lf.find()
			const landmarksFinderResult = postProcesor
				? postProcesor(lf.allInfos())
				: lf.allInfos()
			const convertedExpectation = convertExpectation(check.expected)
			t.deepEqual(landmarksFinderResult, convertedExpectation)
		})
	}
}

function removeWarnings(landmarks) {
	return landmarks.map(landmark => {
		// eslint-disable-next-line no-unused-vars
		const { warnings, ...info } = landmark
		return info
	})
}

const runs = [
	[ 'Standard (strict)',
		LandmarksFinderStandard, null, strictChecks, false ],
	[ 'Developer (strict)',
		LandmarksFinderDeveloper, removeWarnings, strictChecks, false ],
	[ 'Standard (heuristics)',
		LandmarksFinderStandard, null, heuristicChecks, true ],
	[ 'Developer (heuristics)',
		LandmarksFinderDeveloper, removeWarnings, heuristicChecks, true ]]

for (const run of runs) {
	testSpecificLandmarksFinder(...run)
}


//
// Expectation format conversion
//

function convertCore(landmarksFormatData, testSuiteFormatData, depth) {
	for (const landmark of testSuiteFormatData) {
		landmarksFormatData.push({
			'depth': depth,
			'role': landmark.role,
			'roleDescription': landmark.roleDescription,
			'label': landmark.label,
			'selector': landmark.selector,
			'guessed': landmark.guessed ? true : false
		})
		if (landmark.contains) {
			convertCore(landmarksFormatData, landmark.contains, depth + 1)
		}
	}
}

function convertExpectation(testSuiteFormatData) {
	const landmarksFormatData = []
	convertCore(landmarksFormatData, testSuiteFormatData, 0)
	return landmarksFormatData
}
