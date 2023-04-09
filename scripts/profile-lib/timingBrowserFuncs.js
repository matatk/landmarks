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

// FIXME: More tests!
// - Change a label - NOTE: Currently covered by the re-computation of labels each time.
//   + contents of aria-labelledby element
//   + aria-label of landmark
//   + aria-label of aria-labelledby element?
//   + aria-label of element within aria-labelledby element?
// - Hide or show landmark content (aria-hidden / CSS?)
// - Hide or show non-landmark content (really?)

export const mutationTests = {
	mutationTestAddNonLandmarkElementAtStartOfBody,
	mutationTestAddLandmarkAtStartOfBody,
	mutationTestAddNonLandmarkElementAtEndOfBody,
	mutationTestAddLandmarkAtEndOfBody,
	mutationTestAddNonLandmarkElementRandomly,
	mutationTestAddLandmarkWithinRandomLandmark,
	mutationTestChangeRoleOfRandomLandmark,
	mutationTestChangeRoleDescriptionOfRandomLandmark,
	mutationTestRemoveRandomLandmark,
	mutationTestRemoveRandomElement,
	mutationTestRemoveRandomLabellingElement,  // TODO: needs labelling elements to exist
}

export const mutationTestsNeedingLandmarks = new Set([
	mutationTestAddLandmarkWithinRandomLandmark,
	mutationTestChangeRoleOfRandomLandmark,
	mutationTestChangeRoleDescriptionOfRandomLandmark,
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
				// FIXME REALLY DRY
				// handled by always recomputing label 'aria-label',
				// handled by always recomputing label 'aria-labelledby',
				'aria-roledescription',
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

function mutationTestAddNonLandmarkElementAtStartOfBody(runTest) {
	if (runTest) {
		window.notALandmark = document.createElement('DIV')
		window.notALandmark.appendChild(document.createTextNode('not a landmark'))
		document.body.insertBefore(window.notALandmark, document.body.firstChild)
	} else {
		window.cleanUp(() => window.notALandmark.remove())
	}
}

function mutationTestAddLandmarkAtStartOfBody(runTest) {
	if (runTest) {
		window.addedLandmark = document.createElement('ASIDE')
		window.addedLandmark.setAttribute('aria-label', 'TEST LANDMARK')
		window.addedLandmark.appendChild(document.createTextNode('forty-two'))
		document.body.insertBefore(window.addedLandmark, document.body.firstChild)
	} else {
		window.cleanUp(() => window.addedLandmark.remove())
	}
}

function mutationTestAddNonLandmarkElementAtEndOfBody(runTest) {
	if (runTest) {
		window.notALandmark = document.createElement('DIV')
		window.notALandmark.appendChild(document.createTextNode('not a landmark'))
		document.body.appendChild(window.notALandmark)
	} else {
		window.cleanUp(() => window.notALandmark.remove())
	}
}

function mutationTestAddLandmarkAtEndOfBody(runTest) {
	if (runTest) {
		window.addedLandmark = document.createElement('ASIDE')
		window.addedLandmark.setAttribute('aria-label', 'TEST LANDMARK')
		window.addedLandmark.appendChild(document.createTextNode('forty-two'))
		document.body.appendChild(window.addedLandmark)
	} else {
		window.cleanUp(() => window.addedLandmark.remove())
	}
}

function mutationTestAddNonLandmarkElementRandomly(runTest) {
	if (runTest) {
		window.notALandmark = document.createElement('DIV')
		window.notALandmark.appendChild(document.createTextNode('not a landmark'))

		const elements = document.body.getElementsByTagName('*')
		const index = Math.floor(Math.random() * elements.length)
		const picked = elements[index]

		picked.appendChild(window.notALandmark)
	} else {
		window.cleanUp(() => window.notALandmark.remove())
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

function mutationTestChangeRoleOfRandomLandmark(index) {
	if (index !== null) {
		// TODO: getLandmarkElementInfo() has side effects?
		window.picked
			= window.landmarksFinder.getLandmarkElementInfo(index).element
		window.previousRole = window.picked.getAttribute('role')
		window.picked.setAttribute('role', 'complementary')  // FIXME: _change_ role
	} else {
		window.cleanUp(() => {
			if (window.previousRole !== null && window.previousRole !== '') {
				window.picked.setAttribute('role', window.previousRole)
			} else {
				window.picked.removeAttribute('role')
			}
		})
	}
}

function mutationTestChangeRoleDescriptionOfRandomLandmark(index) {
	if (index !== null) {
		// TODO: getLandmarkElementInfo() has side effects?
		window.picked
			= window.landmarksFinder.getLandmarkElementInfo(index).element
		window.previousRoleDescription = window.picked.getAttribute('aria-roledescription')
		window.picked.setAttribute('aria-roledescription', 'forty-two')  // FIXME: _change_ role
	} else {
		window.cleanUp(() => {
			if (window.previousRoleDescription !== null && window.previousRoleDescription !== '') {
				window.picked.setAttribute('aria-roledescription', window.previousRoleDescription)
			} else {
				window.picked.removeAttribute('aria-roledescription')
			}
		})
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

// NOTE: This may not remove the element that labels an actual landmark.
function mutationTestRemoveRandomLabellingElement(runTest) {
	if (runTest) {
		const elements = []
		for (const labelled of document.body.querySelectorAll('[aria-labelledby]')) {
			for (const id of labelled.getAttribute('aria-labelledby').split(/\s+/)) {
				const labeller = document.getElementById(id)
				if (labeller) elements.push(labeller)
			}
		}
		if (elements.length) {
			const index = Math.floor(Math.random() * elements.length)
			const picked = elements[index]

			window.pNext = picked.nextSibling
			window.pParent = picked.parentNode
			picked.parentNode.removeChild(picked)
			window.backup = picked
		}
	} else {
		window.cleanUp(() => {
			if (window.backup) window.pParent.insertBefore(window.backup, window.pNext)
		})
	}
}
