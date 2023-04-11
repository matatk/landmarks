//
// Element counting
//

export function elementCounts(selectInteractives, useHeuristics) {
	const elements = document.querySelectorAll('*').length
	const interactiveElements =
		document.querySelectorAll(selectInteractives).length

	const lf = new window.LandmarksFinder(window, useHeuristics, false)
	lf.find()

	return {
		'numElements': elements,
		'numInteractiveElements': interactiveElements,
		'interactiveElementsPercent': (interactiveElements / elements) * 100,
		'numLandmarks': lf.getNumberOfLandmarks()
	}
}


//
// Scanning and focusing
//

export function landmarkScan(times, useHeuristics, useDevMode) {
	const lf = new window.LandmarksFinder(window, useHeuristics, useDevMode)
	const scanTimes = []

	for (let i = 0; i < times; i++) {
		const start = window.performance.now()
		lf.find()
		const end = window.performance.now()
		scanTimes.push(end - start)
	}

	return scanTimes
}

export function landmarkNav(times, selectInteractives, dir, useHeuristics) {
	const lf = new window.LandmarksFinder(window, useHeuristics, false)
	const interactiveElements = document.querySelectorAll(selectInteractives)
	const navigationTimes = []
	// Tests showed that indirectly calling the navigation function is between
	// 3% and 8% slower than duplicating the code and calling it directly.
	const navigationFunction = dir === 'forward'
		? lf.getNextLandmarkElementInfo
		: dir === 'back'
			? lf.getPreviousLandmarkElementInfo
			: null

	for (let i = 0; i < times; i++) {
		const element = interactiveElements[
			Math.floor(Math.random() * interactiveElements.length)]
		element.focus()
		const start = window.performance.now()
		navigationFunction()
		const end = window.performance.now()
		navigationTimes.push(end - start)
	}

	return navigationTimes
}


//
// Mutation handling
//

// FIXME: on wikipedia article, remove random element, a labelling element can
//        get removed and it fails (expected) BUT the FULL test results show
//        the lack of the label, and the mutated contain it.

// Housekeeping

// FIXME: More tests!
//       - Change a label (aria-labelledby value OR element contents / aria-label)
//       - Remove a label (aria-labelledby element / aria-label)
//       - Change a role (role)
//       - Hide or show non-landmark content (really?)
//       - Hide or show landmark content (aria-hidden / CSS?)

export const mutationTests = {
	mutationTestAddSimpleNonLandmarkElementAtStartOfBody,
	mutationTestAddSimpleLandmarkAtStartOfBody,
	mutationTestAddSimpleNonLandmarkElementAtEndOfBody,
	mutationTestAddSimpleLandmarkAtEndOfBody,
	mutationTestAddLandmarkWithinRandomLandmark,
	mutationTestRemoveRandomLandmark,
	mutationTestRemoveRandomElement
}

export const mutationTestsNeedingLandmarks = new Set([
	mutationTestAddLandmarkWithinRandomLandmark,
	mutationTestRemoveRandomLandmark
])

export function mutationSetup(useHeuristics) {
	window.landmarksFinder =
		new window.LandmarksFinder(window, useHeuristics, false)
	const observer =
		new MutationObserver(window.landmarksFinder.debugHandleMutations)

	function startObserving() {
		// TODO: DRY with content script
		// FIXME: doesn't include roledescription
		observer.observe(document, {
			attributes: true,
			childList: true,
			subtree: true,
			attributeFilter: [
				'aria-label',
				'aria-labelledby',
				'class',
				'hidden',
				'role',
				'style'
			]
		})
	}

	window.cleanUp = function(cleanUpTask) {
		observer.disconnect()
		cleanUpTask()
		// Re-find, so as to reset results so that they will match those
		// collected already by the code running outside of the browser.
		window.landmarksFinder.find()
		startObserving()
	}

	startObserving()
}

export function getLandmarksAfterFullScan() {
	window.landmarksFinder.find()
	return window.landmarksFinder.allInfos()
}

export function getAlreadyFoundLandmarks() {
	return window.landmarksFinder.allInfos()
}

export function mutationAfterEach() {
	const results = window.landmarksFinder.debugMutationHandlingTimes()
	window.landmarksFinder.clearDebugMutationHandlingTimes()
	return results
}

// Simulated mutations

function mutationTestAddSimpleNonLandmarkElementAtStartOfBody(runTest) {
	if (runTest) {
		window.notALandmark = document.createElement('DIV')
		window.notALandmark.appendChild(document.createTextNode('not a landmark'))
		document.body.insertBefore(window.notALandmark, document.body.firstChild)
	} else {
		window.cleanUp(() => window.notALandmark.remove())
	}
}

function mutationTestAddSimpleLandmarkAtStartOfBody(runTest) {
	if (runTest) {
		window.addedLandmark = document.createElement('ASIDE')
		window.addedLandmark.setAttribute('aria-label', 'TEST LANDMARK')
		window.addedLandmark.appendChild(document.createTextNode('forty-two'))
		document.body.insertBefore(window.addedLandmark, document.body.firstChild)
	} else {
		window.cleanUp(() => window.addedLandmark.remove())
	}
}

function mutationTestAddSimpleNonLandmarkElementAtEndOfBody(runTest) {
	if (runTest) {
		window.notALandmark = document.createElement('DIV')
		window.notALandmark.appendChild(document.createTextNode('not a landmark'))
		document.body.appendChild(window.notALandmark)
	} else {
		window.cleanUp(() => window.notALandmark.remove())
	}
}

function mutationTestAddSimpleLandmarkAtEndOfBody(runTest) {
	if (runTest) {
		window.addedLandmark = document.createElement('ASIDE')
		window.addedLandmark.setAttribute('aria-label', 'TEST LANDMARK')
		window.addedLandmark.appendChild(document.createTextNode('forty-two'))
		document.body.appendChild(window.addedLandmark)
	} else {
		window.cleanUp(() => window.addedLandmark.remove())
	}
}

function mutationTestAddLandmarkWithinRandomLandmark(index) {
	if (index !== null) {
		// TODO: getLandmarkElementInfo() has side effects?
		const parent =
			window.landmarksFinder.getLandmarkElementInfo(index).element
		window.addedLandmark = document.createElement('ASIDE')
		window.addedLandmark.setAttribute('aria-label', 'TEST LANDMARK')
		window.addedLandmark.appendChild(document.createTextNode('complementary landmark'))
		parent.appendChild(window.addedLandmark)
	} else {
		window.cleanUp(() => window.addedLandmark.remove())
	}
}

function mutationTestRemoveRandomLandmark(index) {
	if (index !== null) {
		// TODO: getLandmarkElementInfo() has side effects?
		const picked
			= window.landmarksFinder.getLandmarkElementInfo(index).element
		window.pNext = picked.nextSibling
		window.pParent = picked.parentNode
		picked.remove()
		window.backup = picked
	} else {
		window.cleanUp(() => {
			window.pParent.insertBefore(window.backup, window.pNext)
		})
	}
}

function mutationTestRemoveRandomElement(runTest) {
	if (runTest) {
		const elements = document.body.getElementsByTagName('*')
		const index = Math.floor(Math.random() * elements.length)
		const picked = elements[index]
		// TODO: DRY with the above
		window.pNext = picked.nextSibling
		window.pParent = picked.parentNode
		picked.parentNode.removeChild(picked)
		window.backup = picked
	} else {
		window.cleanUp(() => {
			window.pParent.insertBefore(window.backup, window.pNext)
		})
	}
}
