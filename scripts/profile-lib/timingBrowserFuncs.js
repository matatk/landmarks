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

// Housekeeping

// TODO: More tests!
//       - Change a label
//       - Remove a label
//       - Change a role
//       - Hide or show non-landmark content
//       - Hide or show landmark content

export const mutationTests = {
	mutationTestAddNonLandmarkElement,
	mutationTestAddLandmark,
	mutationTestAddLandmarkWithinRandomLandmark,
	mutationTestRemoveRandomLandmark
}

export const mutationTestsNeedingIndex = new Set([
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

// TODO: check the answer (only on one go)
// TODO: place it in a random place in the DOM?
function mutationTestAddNonLandmarkElement(runTest) {
	if (runTest) {
		const notALandmark = document.createElement('DIV')
		notALandmark.appendChild(document.createTextNode('not a landmark'))
		document.body.appendChild(notALandmark)
	} else {
		// NOTE: Cleanup not needed.
	}
}

// TODO: check the answer (only on one go)
// TODO: Add a COMPLICATED landmark
// TODO: replace this with the next one (and keep the shorter function name)?
function mutationTestAddLandmark(runTest) {
	if (runTest) {
		window.addedLandmark = document.createElement('NAV')
		window.addedLandmark.appendChild(document.createTextNode('navigation landmark'))
		document.body.appendChild(window.addedLandmark)
	} else {
		window.cleanUp(() => window.addedLandmark.remove())
	}
}

// TODO: check the answer (only on one go)
function mutationTestAddLandmarkWithinRandomLandmark(index) {
	if (index !== null) {
		const parent =
			window.landmarksFinder.getLandmarkElementInfo(index).element
		window.addedLandmark = document.createElement('ASIDE')
		window.addedLandmark.appendChild(document.createTextNode('complementary landmark'))
		parent.appendChild(window.addedLandmark)
	} else {
		window.cleanUp(() => window.addedLandmark.remove())
	}
}

// TODO: check the answer (only on one go)
// TODO: not strictly just removing things here
function mutationTestRemoveRandomLandmark(index) {
	if (index !== null) {
		const picked
			= window.landmarksFinder.getLandmarkElementInfo(index).element
		window.backup = picked
		window.dummy = document.createElement('DIV')
		picked.replaceWith(window.dummy)
	} else {
		window.cleanUp(() => window.dummy.replaceWith(window.backup))
	}
}
