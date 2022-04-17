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

export function mutationSetup(useHeuristics) {
	// TODO: Share across all tasks
	window.landmarksFinder =
		new window.LandmarksFinder(window, useHeuristics, false)
	window.observer = new MutationObserver(
		window.landmarksFinder.debugHandleMutations)
	// TODO: DRY with content script
	// FIXME: doesn't include roledescription
	window.observer.observe(document, {
		attributes: true,
		childList: true,
		subtree: true,
		attributeFilter: [
			'class', 'style', 'hidden', 'role', 'aria-labelledby', 'aria-label'
		]
	})
}

// TODO: check the answer (only on one go)
function mutationTestAddNonLandmarkElement() {
	const notALandmark = document.createElement('DIV')
	notALandmark.appendChild(document.createTextNode('not a landmark'))
	document.body.appendChild(notALandmark)
}

// TODO: check the answer (only on one go)
// TODO: Add a COMPLICATED landmark
function mutationTestAddLandmark() {
	const landmark = document.createElement('NAV')
	landmark.appendChild(document.createTextNode('navigation landmark'))
	document.body.appendChild(landmark)
}

// TODO: check the answer (only on one go)
function mutationTestAddLandmarkWithinRandomLandmark() {
	// TODO
}

// TODO: check the answer (only on one go)
function mutationTestRemoveRandomLandmark() {
	// TODO
}

export const mutationTests = {
	mutationTestAddNonLandmarkElement,
	mutationTestAddLandmark,
	mutationTestAddLandmarkWithinRandomLandmark,
	mutationTestRemoveRandomLandmark
}

export function mutationTearDown() {
	return window.landmarksFinder.debugMutationHandlingTimes()
}
