import test from 'ava'
import jsdom from 'jsdom'
import pssst from 'page-structural-semantics-scanner-tests'
import LandmarksFinderStandard from '../src/code/landmarksFinderStandard'
import LandmarksFinderDeveloper from '../src/code/landmarksFinderDeveloper'

const { JSDOM } = jsdom
const checks = pssst.getFullPageTestsInline()

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
		'selector': 'body > header'
	},
	{
		'depth': 1,
		'role': 'navigation',
		'roleDescription': null,
		'label': 'World of wombats',
		'selector': 'body > header > nav'
	},
	{
		'depth': 0,
		'role': 'main',
		'roleDescription': null,
		'label': 'Looking after your wombat',
		'selector': 'body > main'
	},
	{
		'depth': 1,
		'role': 'navigation',
		'roleDescription': null,
		'label': 'Looking after your wombat Topics',
		'selector': 'body > main > nav:nth-child(2)'
	},
	{
		'depth': 0,
		'role': 'contentinfo',
		'roleDescription': null,
		'label': null,
		'selector': 'body > footer'
	}
]


//
// Check the damage report machine
//

test('expectation conversion from test suite to Landmarks format', t => {
	t.deepEqual(
		convertExpectation(testSuiteFormatExpectation), landmarksFormatExpectation)
})


//
// Check the LandmarksFinders
//

function testSpecificLandmarksFinder(Scanner, scannerName, postProcesor) {
	for (const check of Object.values(checks)) {
		test(scannerName + ': ' + check.meta.name, t => {
			const dom = new JSDOM(check.fixture)
			const lf = new Scanner(dom.window, dom.window.document)
			lf.find()
			const landmarksFinderResult = postProcesor
				? postProcesor(lf.allInfos())
				: lf.allInfos()
			const convertedExpectation = convertExpectation(check.expected)
			t.deepEqual(landmarksFinderResult, convertedExpectation)
		})
	}
}

function removeErrors(landmarks) {
	return landmarks.map(landmark => {
		// eslint-disable-next-line no-unused-vars
		const { error, ...info } = landmark
		return info
	})
}

const runs = [
	[ LandmarksFinderStandard, 'Standard', null ],
	[ LandmarksFinderDeveloper, 'Developer', removeErrors ]]

for (const [scanner, name, postProcesor] of runs) {
	testSpecificLandmarksFinder(scanner, name, postProcesor)
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
			'selector': landmark.selector
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
