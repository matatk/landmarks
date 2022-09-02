import {
	isVisuallyHidden,
	isSemantiallyHidden,
	getValidExplicitRole,
	getRoleFromTagNameAndContainment,
	getARIAProvidedLabel,
	isLandmark,
	getRoleDescription,
	createSelector
} from './landmarksFinderDOMUtils.js'

const LANDMARK_INDEX_ATTR = 'data-landmark-index'

const levelTagNames = level => level.map(i => i.element.tagName).join(',')

export default function LandmarksFinder(win, _useHeuristics, _useDevMode) {
	const doc = win.document
	let useHeuristics = _useHeuristics  // parameter is only used by tests
	let useDevMode = _useDevMode        // parameter is only used by tests

	//
	// Found landmarks
	//

	// Each member of these data structures is an object of the form:
	//   role (string)                   -- the ARIA role
	//   roleDescription (string | null) -- custom role description
	//   label (string | null)           -- associated label
	//   selector (string)               -- CSS selector path of element
	//   element (HTML*Element)          -- in-memory element
	//   guessed (bool)                  -- landmark was gathered by heuristic
	// and, in developer mode:
	//   warnings [string]               -- list of warnings about this element
	let landmarksTree = []  // point of truth
	let landmarksList = []  // created alongside the tree; used for focusing

	// Tracking landmark finding
	let previousLandmarkEntry = null
	let cachedFilteredTree = null
	let cachedAllInfos = null
	let cachedAllElementInfos = null

	// Tracking landmark finding in developer mode
	let _pageWarnings = []
	const _unlabelledRoleElements = new Map()
	let _visibleMainElements = []


	//
	// Keeping track of landmark navigation
	//

	let currentlySelectedIndex   // the landmark currently having focus/border
	let mainElementIndices = []  // if we find <main> or role="main" elements
	let mainIndexPointer         // allows us to cylce through main regions
	let foundNavigationRegion    // if not, we can go and guess one

	// Keep a reference to the currently-selected element in case the page
	// changes and the landmark is still there, but has moved within the list.
	let currentlySelectedElement

	function updateSelectedAndReturnElementInfo(index) {
		// TODO: Don't need an index check, as we trust the source. Does that
		//       mean we also don't need the length check?
		if (landmarksList.length === 0) return
		currentlySelectedIndex = index
		currentlySelectedElement = landmarksList[index].element
		return {
			element: currentlySelectedElement,
			role: landmarksList[index].role,
			roleDescription: landmarksList[index].roleDescription,
			label: landmarksList[index].label,
			guessed: landmarksList[index].guessed
			// No need to send the selector or warnings
		}
	}


	//
	// Finding landmarks
	//

	function find() {
		landmarksTree = []
		landmarksList = []
		previousLandmarkEntry = null
		cachedFilteredTree = null
		cachedAllInfos = null
		cachedAllElementInfos = null

		if (useDevMode) {
			_pageWarnings = []
			_unlabelledRoleElements.clear()
			_visibleMainElements = []
		}

		mainElementIndices = []
		mainIndexPointer = -1
		foundNavigationRegion = false
		currentlySelectedIndex = -1

		getLandmarks(doc.body.parentNode, landmarksTree)
		if (landmarksTree.length) previousLandmarkEntry.next = landmarksTree[0]
		if (useDevMode) developerModeChecks()
		if (useHeuristics) tryHeuristics()

		for (let i = 0; i < landmarksList.length; i++) {
			landmarksList[i].index = i
			// FIXME: test
			landmarksList[i].element.setAttribute(LANDMARK_INDEX_ATTR, i)
		}
	}

	function getLandmarks(element, thisLevel) {
		if (isVisuallyHidden(win, element) || isSemantiallyHidden(element)) {
			return
		}

		// Elements with explicitly-set rolees
		const rawRoleValue = element.getAttribute('role')
		const explicitRole = rawRoleValue
			? getValidExplicitRole(rawRoleValue)
			: null
		const hasExplicitRole = explicitRole !== null

		// Support HTML5 elements' native roles
		const role = explicitRole ?? getRoleFromTagNameAndContainment(element)

		// The element may or may not have a label
		const label = getARIAProvidedLabel(doc, element)

		// Add the element if it should be considered a landmark
		let thisLandmarkEntry = null
		if (role && isLandmark(role, hasExplicitRole, label)) {
			thisLandmarkEntry = {
				'type': 'landmark',
				'role': role,
				'roleDescription': getRoleDescription(element),
				'label': label,
				'element': element,
				'selector': createSelector(element),
				'guessed': false,
				'contains': [],
				'previous': previousLandmarkEntry,
				'next': null
			}

			if (previousLandmarkEntry) {
				previousLandmarkEntry.next = thisLandmarkEntry
			}

			thisLevel.push(thisLandmarkEntry)
			landmarksList.push(thisLandmarkEntry)

			previousLandmarkEntry = thisLandmarkEntry

			if (useDevMode) {
				thisLandmarkEntry.warnings = []

				if (!label) {
					if (!_unlabelledRoleElements.has(role)) {
						_unlabelledRoleElements.set(role, [])
					}
					_unlabelledRoleElements.get(role).push(element)
				}

				if (role === 'main' && !hasExplicitRole) {
					_visibleMainElements.push(element)
				}
			}

			// Was this element selected before we were called (i.e.
			// before the page was dynamically updated)?
			if (currentlySelectedElement === element) {
				currentlySelectedIndex = landmarksList.length - 1
			}

			// There should only be one main region, but pages may be bad and
			// wrong, so catch 'em all...
			if (role === 'main') {
				mainElementIndices.push(landmarksList.length - 1)
			}
		}

		// One just one page I've seen an error here in Chrome (91) which seems
		// to be a bug, because only one HTMLElement was returned; not an
		// HTMLCollection. Checking for this would cause a slowdown, so
		// ignoring for now.
		for (const elementChild of element.children) {
			getLandmarks(
				elementChild,
				thisLandmarkEntry?.contains ?? thisLevel
			)
		}
	}


	//
	// Developer mode-specific checks
	//

	function developerModeChecks() {
		const _duplicateUnlabelledWarnings = getDuplicateUnlabelledWarnings()

		if (mainElementIndices.length === 0) {
			_pageWarnings.push('lintNoMain')
		}

		if (mainElementIndices.length > 1) {
			_pageWarnings.push('lintManyMains')
		}

		for (const landmark of landmarksList) {
			if (_visibleMainElements.length > 1
				&& _visibleMainElements.includes(landmark.element)) {
				landmark.warnings.push('lintManyVisibleMainElements')
			}

			if (_duplicateUnlabelledWarnings.has(landmark.element)) {
				landmark.warnings.push(
					_duplicateUnlabelledWarnings.get(landmark.element))
			}
		}
	}

	function getDuplicateUnlabelledWarnings() {
		const _duplicateUnlabelledWarnings = new Map()
		for (const elements of _unlabelledRoleElements.values()) {
			if (elements.length > 1) {
				for (const element of elements) {
					_duplicateUnlabelledWarnings.set(
						element, 'lintDuplicateUnlabelled')
				}
			}
		}
		return _duplicateUnlabelledWarnings
	}


	//
	// Heuristic checks
	//

	function makeLandmarkEntry(guessed, role) {
		return {
			'type': 'landmark',
			'role': role,
			'roleDescription': getRoleDescription(guessed),
			'label': getARIAProvidedLabel(doc, guessed),
			'element': guessed,
			'selector': createSelector(guessed),
			'guessed': true
		}
	}

	function addGuessed(guessed, role) {
		if (guessed && guessed.innerText) {
			const entry = makeLandmarkEntry(guessed, role)
			if (landmarksList.length === 0) {
				landmarksTree.push(entry)
				landmarksList.push(entry)
				if (role === 'main') mainElementIndices = [0]
			} else {
				const insertAt =
					getIndexOfLandmarkAfter(guessed) ?? landmarksList.length
				landmarksTree.splice(insertAt, 0, entry)
				landmarksList.splice(insertAt, 0, entry)
				if (role === 'main') mainElementIndices = [insertAt]
			}
			return true
		}
		return false
	}

	function tryFindingMain() {
		if (mainElementIndices.length === 0) {
			for (const id of ['main', 'content', 'main-content']) {
				if (addGuessed(doc.getElementById(id), 'main')) return
			}
			const classMains = doc.getElementsByClassName('main')
			if (classMains.length === 1) addGuessed(classMains[0], 'main')
		}
	}

	function tryFindingNavs() {
		if (!foundNavigationRegion) {
			for (const id of ['navigation', 'nav']) {
				if (addGuessed(doc.getElementById(id), 'navigation')) break
			}
			for (const className of ['navigation', 'nav']) {
				for (const guessed of doc.getElementsByClassName(className)) {
					addGuessed(guessed, 'navigation')
				}
			}
		}
	}

	function tryHeuristics() {
		tryFindingMain()
		tryFindingNavs()
	}


	//
	// Support for finding next landmark from focused element
	//

	function getIndexOfLandmarkAfter(element) {
		for (let i = 0; i < landmarksList.length; i++) {
			const rels =
				element.compareDocumentPosition(landmarksList[i].element)
			// eslint-disable-next-line no-bitwise
			if (rels & win.Node.DOCUMENT_POSITION_FOLLOWING) return i
		}
		return null
	}

	function getIndexOfLandmarkBefore(element) {
		for (let i = landmarksList.length - 1; i >= 0; i--) {
			const rels =
				element.compareDocumentPosition(landmarksList[i].element)
			// eslint-disable-next-line no-bitwise
			if (rels & win.Node.DOCUMENT_POSITION_PRECEDING) return i
		}
		return null
	}


	//
	// Support for public API
	//

	function filterTree(subtree) {
		const filteredLevel = []

		for (const entry of subtree) {
			// eslint-disable-next-line no-unused-vars
			const { contains, depth, element, previous, next, ...info } = entry
			const filteredEntry = { ...info }

			// NOTE: Guessed landmarks aren't given a 'contains' property
			const filteredContains = Array.isArray(entry.contains)
				? filterTree(entry.contains)
				: []

			if (filteredContains.length > 0) {
				filteredEntry.contains = filteredContains
			}

			filteredLevel.push(filteredEntry)
		}

		return filteredLevel
	}

	function checkBoolean(name, value) {
		if (typeof value !== 'boolean') {
			throw Error(`${name}() given ${typeof value} value: ${value}`)
		}
	}


	//
	// Handling mutations; debugging handling mutations
	//

	// FIXME: Need to deal with main indices, dev warnings, etc.
	function handleMutations(mutations) {
		for (const mutation of mutations) {
			switch (mutation.type) {
				case 'childList':
					handleChildListMutation(mutation)
					break
				case 'attributes':
					handleAttributeMutation(mutation)
					break
			}
		}
	}

	// FIXME: What about when a valid landmark has its labelling element
	//        removed? (keep track of all labelling elements? a bit much?)
	function handleChildListMutation(mutation) {
		previousLandmarkEntry.next = null

		let found = mutation.target
		while (!found.hasAttribute(LANDMARK_INDEX_ATTR) && found !== doc.body) {
			found = found.parentNode
		}

		if (found === doc.body) {
			find()
			return
		}

		const info = foundLandmarkElementInfo(found)
		if (info === null) {
			console.error('info is null')
			find()
			return
		}

		// If we got here, we now have a subtree to target.

		const originalNext = info.next

		info.contains = []
		previousLandmarkEntry = info
		for (const childElement of found.children) {
			cachedFilteredTree = null
			cachedAllInfos = null
			cachedAllElementInfos = null
			getLandmarks(childElement, info.contains)
		}

		if (info.contains.length > 0) {
			info.contains[info.contains.length - 1].next = originalNext
		} else {
			info.next = originalNext
		}

		// debugTree()

		// TODO: test different string syntax for performance
		for (const el of doc.querySelectorAll(`[${LANDMARK_INDEX_ATTR}]`)) {
			el.removeAttribute(LANDMARK_INDEX_ATTR)
		}

		landmarksList = []
		walk(landmarksList, landmarksTree)

		if (landmarksTree.length) previousLandmarkEntry.next = landmarksTree[0]
		if (useDevMode) developerModeChecks()
		if (useHeuristics) tryHeuristics()

		for (let i = 0; i < landmarksList.length; i++) {
			landmarksList[i].index = i
			landmarksList[i].element.setAttribute(LANDMARK_INDEX_ATTR, i)
		}
	}

	function handleAttributeMutation(mutation) {
		console.log(mutation)
		find()
	}

	// FIXME: test
	function foundLandmarkElementInfo(candidate) {
		const number = Number(candidate.getAttribute(LANDMARK_INDEX_ATTR))
		if (isNaN(number)) return null
		if (number < 0 || number > (landmarksList.length - 1)) return null
		if (landmarksList[number].element !== candidate) return null
		return landmarksList[number]
	}

	// FIXME: test this and/or wider
	function walk(list, root) {
		let entry = root?.[0]
		while (entry) {
			list.push(entry)
			entry = entry.next
		}
	}

	let debugMutationHandlingTimes = []

	function debugWrap(func) {
		return function(...args) {
			const start = win.performance.now()
			func(...args)
			const end = win.performance.now()
			debugMutationHandlingTimes.push(end - start)
		}
	}

	let debugTreeString = '\n'

	function debugTree() {
		debugTreeCore(landmarksTree, 0)
		console.log(debugTreeString)
	}

	function debugTreeCore(tree, depth) {
		for (const thing of tree) {
			const { previous, next, element, contains, ...debug } = thing
			debugTreeString +=
				'~ '.repeat(depth) + JSON.stringify(debug, null, 2) + '\n'
			debugTreeCore(thing.contains, depth + 1)
		}
	}


	//
	// Public API
	//

	this.find = find
	this.getNumberOfLandmarks = () => landmarksList.length

	// This includes the selector, warnings, everything except the element.
	// Used by the UI.
	this.allInfos = function() {
		if (!cachedAllInfos) {
			cachedAllInfos = landmarksList.map(entry => {
				// eslint-disable-next-line no-unused-vars
				const { element, contains, previous, next, ...info } = entry
				return info
			})
		}
		return cachedAllInfos
	}

	// As above, but also including the element. Used by the borderDrawer.
	this.allElementsInfos = function() {
		if (!cachedAllElementInfos) {
			cachedAllElementInfos = landmarksList.map(entry => {
				// eslint-disable-next-line no-unused-vars
				const { contains, previous, next, ...info } = entry
				return info
			})
		}
		return cachedAllElementInfos
	}

	// Just the tree structure, in serialisable form
	this.tree = function() {
		if (!cachedFilteredTree) {
			cachedFilteredTree = filterTree(landmarksTree)
		}
		return cachedFilteredTree
	}

	// These all return elements and their related info

	this.getNextLandmarkElementInfo = function() {
		if (doc.activeElement !== null && doc.activeElement !== doc.body) {
			const index = getIndexOfLandmarkAfter(doc.activeElement)
			if (index !== null) {
				return updateSelectedAndReturnElementInfo(index)
			}
		}
		return updateSelectedAndReturnElementInfo(
			(currentlySelectedIndex + 1) % landmarksList.length)
	}

	this.getPreviousLandmarkElementInfo = function() {
		if (doc.activeElement !== null && doc.activeElement !== doc.body) {
			const index = getIndexOfLandmarkBefore(doc.activeElement)
			if (index !== null) {
				return updateSelectedAndReturnElementInfo(index)
			}
		}
		return updateSelectedAndReturnElementInfo(
			(currentlySelectedIndex <= 0) ?
				landmarksList.length - 1 : currentlySelectedIndex - 1)
	}

	this.getLandmarkElementInfo = function(index) {
		return updateSelectedAndReturnElementInfo(index)
	}

	// If pages are naughty and have more than one 'main' region, we cycle
	// betwixt them.
	this.getMainElementInfo = function() {
		if (mainElementIndices.length > 0) {
			mainIndexPointer =
				(mainIndexPointer + 1) % mainElementIndices.length
			const mainElementIndex = mainElementIndices[mainIndexPointer]
			return updateSelectedAndReturnElementInfo(mainElementIndex)
		}
		return null
	}

	this.useHeuristics = function(use) {
		checkBoolean(useHeuristics, use)
		useHeuristics = use
	}

	this.useDevMode = function(use) {
		checkBoolean(useDevMode, use)
		useDevMode = use
	}

	this.debugHandleMutations = debugWrap(handleMutations)
	this.debugMutationHandlingTimes = () => debugMutationHandlingTimes
	this.clearDebugMutationHandlingTimes = () => debugMutationHandlingTimes = []
}
