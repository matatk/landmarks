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
	window.landmarksFinder =
		new window.LandmarksFinder(window, useHeuristics, false)
	return true
}

export function mutationTest() {
	const lf = window.landmarksFinder
	lf.find()
	lf.debugHandleMutations([])
	lf.debugHandleMutations([])
	lf.debugHandleMutations([])
	return lf.debugFuncTimes()
}
