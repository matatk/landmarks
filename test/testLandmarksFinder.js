import path from 'path'
import { fileURLToPath } from 'url'

import test from 'ava'
import jsdom from 'jsdom'
import pssst from 'page-structural-semantics-scanner-tests'
import LandmarksFinder from '../src/code/landmarksFinder.js'

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
				'selector': 'body > header > nav',
				'guessed': false
			}
		],
		'guessed': false
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
				'selector': 'body > main > nav:nth-child(2)',
				'guessed': false
			}
		],
		'guessed': false
	},
	{
		'type': 'landmark',
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
		'type': 'landmark',
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
	runName, Scanner, postProcesor, checks, heuristics, developer) {
	for (const check of Object.values(checks)) {
		test(runName + ': ' + check.meta.name, t => {
			const dom = new JSDOM(check.fixture)

			// Expose jsdom's existing textContent method, tweaked, as innerText
			// https://github.com/jsdom/jsdom/issues/1245#issuecomment-445848341
			// https://github.com/jsdom/jsdom/issues/1245#issuecomment-584677454
			// Plus my own tweak removing whitespace.
			if (heuristics) {
				global.Element = dom.window.Element
				Object.defineProperty(global.Element.prototype, 'innerText', {
					get() {
						this.querySelectorAll('script,style').forEach(
							s => s.remove())
						return this.textContent.replace(/\s+/g, '')
					}
				})
			}

			const lf = new Scanner(dom.window, dom.window.document, heuristics, developer)
			lf.find()
			const landmarksFinderResult = postProcesor
				? postProcesor(lf.tree())
				: lf.tree()
			const convertedExpectation = convertExpectation(check.expected)
			t.deepEqual(landmarksFinderResult, convertedExpectation)
		})
	}
}

function removeWarningsCore(landmarks) {
	for (const landmark of landmarks) {
		delete landmark.warnings
		if (landmark.contains) removeWarnings(landmark.contains)
	}
}

function removeWarnings(landmarks) {
	removeWarningsCore(landmarks)
	return landmarks
}

const runs = [
	[ 'Standard (strict)',
		LandmarksFinder, null, strictChecks, false, false ],
	[ 'Developer (strict)',
		LandmarksFinder, removeWarnings, strictChecks, false, true ]]
/*
	[ 'Standard (heuristics)',
		LandmarksFinder, null, heuristicChecks, true, false ],
	[ 'Developer (heuristics)',
		LandmarksFinder, removeWarnings, heuristicChecks, true, true ]]
		*/

for (const run of runs) {
	testSpecificLandmarksFinder(...run)
}


//
// Expectation format conversion
//

function convertCore(testSuiteFormatData) {
	for (const landmark of testSuiteFormatData) {
		landmark.guessed = landmark.guessed ?? false
		if (landmark.contains) convertExpectation(landmark.contains)
	}
}

function convertExpectation(testSuiteFormatData) {
	convertCore(testSuiteFormatData)
	return testSuiteFormatData
}
