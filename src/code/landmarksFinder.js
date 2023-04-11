// FIXME: if useHeuristics changes, undo the guessing!
// FIXME: flag elements added on the last getLandmarks() pass, so that the
//        selector only needs to be computed for the other ones.
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
const LANDMARK_GUESSED_ATTR = 'data-landmark-guessed'

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
	//   contains (self[])               -- array of child landmarks
	//   debug (string)                  -- tagName and role for element
	// and, in developer mode:
	//   warnings [string]               -- list of warnings about this element
	let landmarksTree = []  // point of truth
	let landmarksList = []  // created alongside the tree; used for focusing

	// Tracking landmark finding
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

	// Keep a reference to the currently-selected element in case the page
	// changes and the landmark is still there, but has moved within the list.
	let currentlySelectedElement

	function updateSelectedAndReturnElementInfo(index) {
		// TODO: Don't need an index check, as we trust the source. Does that
		//       mean we also don't need the length check?
		// TODO: The return can be massively simplified, rite?
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

	// TODO: DRY with regenerateListIndicesSelectors()
	function find() {
		// TODO: test different string syntax for performance
		for (const el of doc.querySelectorAll(`[${LANDMARK_INDEX_ATTR}]`)) {
			el.removeAttribute(LANDMARK_INDEX_ATTR)
		}

		landmarksTree = []
		landmarksList = []
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
		currentlySelectedIndex = -1

		// FIXME: only on page startup?
		if (useHeuristics) tryHeuristics()

		getLandmarks(doc.body.parentNode, landmarksTree)
		if (useDevMode) developerModeChecks()

		landmarksList = []
		walk(landmarksList, landmarksTree)
		for (let i = 0; i < landmarksList.length; i++) {
			landmarksList[i].index = i
			// FIXME: test
			landmarksList[i].element.setAttribute(LANDMARK_INDEX_ATTR, i)
		}

		if (landmarksList.length) landmarksList.at(-1).next = landmarksTree[0]
	}

	function getLandmarks(element, thisLevel, previousLandmarkEntry) {
		if (isVisuallyHidden(win, element) || isSemantiallyHidden(element)) {
			return previousLandmarkEntry
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
				'guessed': element.hasAttribute(LANDMARK_GUESSED_ATTR),
				'contains': [],
				'next': null,
				'level': thisLevel,
				'debug': element.tagName + '(' + role + ')'  // FIXME: un-need?
			}

			if (previousLandmarkEntry) {
				previousLandmarkEntry.next = thisLandmarkEntry
			}

			thisLevel.push(thisLandmarkEntry)

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
		previousLandmarkEntry = thisLandmarkEntry ?? previousLandmarkEntry
		for (const elementChild of element.children) {  // TODO: perf
			previousLandmarkEntry = getLandmarks(
				elementChild,
				thisLandmarkEntry?.contains ?? thisLevel,
				previousLandmarkEntry
			)
		}

		return previousLandmarkEntry
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

		for (const landmark of landmarksList) {  // TODO: perf
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
		for (const elements of _unlabelledRoleElements.values()) {  // TODO: prf
			if (elements.length > 1) {
				for (const element of elements) {  // TODO: prf
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

	// FIXME: editing these attrs will trigger mutations
	function tryFindingMain() {
		if (doc.querySelector('main, [role="main"]')) return

		for (const id of ['main', 'content', 'main-content']) {
			const element = doc.getElementById(id)
			if (element && element.innerText) {
				element.setAttribute('role', 'main')
				element.setAttribute(LANDMARK_GUESSED_ATTR, '')
				return
			}
		}

		const classMains = doc.getElementsByClassName('main')
		if (classMains.length === 1 && classMains[0].innerText) {
			classMains[0].setAttribute('role', 'main')
			classMains[0].setAttribute(LANDMARK_GUESSED_ATTR, '')
		}
	}

	// FIXME: editing these attrs will trigger mutations
	function tryFindingNavs() {
		if (doc.querySelector('nav, [role="navigation"]')) return

		for (const id of ['navigation', 'nav']) {
			const element = doc.getElementById(id)
			if (element && element.innerText) {
				element.setAttribute('role', 'navigation')
				element.setAttribute(LANDMARK_GUESSED_ATTR, '')
				break
			}
		}

		for (const className of ['navigation', 'nav']) {
			// TODO: perf?
			for (const element of doc.getElementsByClassName(className)) {
				if (element.innerText) {
					element.setAttribute('role', 'navigation')
					element.setAttribute(LANDMARK_GUESSED_ATTR, '')
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

	// FIXME: un-need 'debug' field
	function filterTree(subtree) {
		const filteredLevel = []

		for (const entry of subtree) {  // TODO: perf?
			// eslint-disable-next-line no-unused-vars
			const { contains, element, previous, next, debug, level, ...info } = entry
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
		for (const mutation of mutations) {  // TODO: perf
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

	// FIXME: Test labelling element being removed.
	//  NOTE: Sometimes this appears to get both additions and removals.
	function handleChildListMutation(mutation) {
		//
		// Quick path for when there are no landmarks, and stuff is added
		//

		if (landmarksList.length === 0) {
			// FIXME: DRY with subtreeLevel added nodes below?
			if (mutation.addedNodes.length) {
				if (useHeuristics) tryHeuristics()
				for (let i = 0; i < mutation.addedNodes.length; i++) {
					getLandmarks(mutation.addedNodes[i], landmarksTree)
				}

				regenerateListIndicesSelectors()
			}
			return  // don't need to worry about removing when 0 landmarks
		}


		//
		// Universally-needed stuff for the rest of the thing
		//

		landmarksList.at(-1).next = null  // stop at end of tree walk


		//
		// Landmarks, or nodes containing landmarks, being removed
		//

		if (mutation.removedNodes.length) {
			let processed = false

			for (const removed of mutation.removedNodes) {  // TODO: perf
				// TODO: How likely is it that precisely a landmark will be removed?
				if (removed.hasAttribute(LANDMARK_INDEX_ATTR)) {
					removeLandmarkFromTree(removed)
					processed = true
				} else {
					let previous = null
					let current = null
					while ((current = removed.querySelector(`[${LANDMARK_INDEX_ATTR}]`)) !== null) {
						// If the next one we find was inside the previous one; it's already been processed.
						if (previous) {
							const rels = previous.compareDocumentPosition(current)
							// eslint-disable-next-line no-bitwise
							if (rels & win.Node.DOCUMENT_POSITION_CONTAINED_BY) {
								current.removeAttribute(LANDMARK_INDEX_ATTR)
								continue
							}
						}
						removeLandmarkFromTree(current)
						processed = true
						current.removeAttribute(LANDMARK_INDEX_ATTR)
						previous = current
					}
				}
			}

			if (processed) regenerateListIndicesSelectors()
		}


		//
		// Work out the subtree for added nodes
		//

		// NOTE: Assumes addedNodes are encountered in DOM order.
		if (mutation.addedNodes.length) {
			// Find the nearest parent landmark, if any
			let found = mutation.target
			while (!found.hasAttribute(LANDMARK_INDEX_ATTR) && found !== doc.body) {
				found = found.parentNode
			}

			// From the parent landmark (if any), work out which subtree level we're at
			// TODO: WHAT IF the attr was malformed? falling back to the landmarkslist may not work?
			const index = foundLandmarkElementIndex(found)
			const subtreeLevel = index !== null ? landmarksList[index].contains : landmarksTree

			// If there are other landmarks at this level of the tree, they're
			// siblings (or we'd be inside of them). We can avoid scanning inside,
			// and replacing, any siblings.
			if (subtreeLevel.length) {
				const before = getIndexOfLandmarkBefore2(mutation.addedNodes[0], subtreeLevel)
				const newBitOfLevel = []
				let startInsertingAt
				let previousLandmarkEntry
				if (before === null) {
					startInsertingAt = 0
					if (index !== null) {
						previousLandmarkEntry = landmarksList[index]
					} else {
						previousLandmarkEntry = null
					}
				} else {
					startInsertingAt = before + 1
					previousLandmarkEntry = subtreeLevel[before]
				}
				const lastEntryInSubTree = previousLandmarkEntry ? lastEntryInsideEntrySubtree(previousLandmarkEntry) : null
				const previousNext = lastEntryInSubTree ? lastEntryInSubTree.next : null
				previousLandmarkEntry = lastEntryInSubTree
				getLandmarksForSubtreeLevelOrPartThereof(mutation.addedNodes, newBitOfLevel, previousLandmarkEntry)
				subtreeLevel.splice(startInsertingAt, 0, ...newBitOfLevel)
				if (newBitOfLevel.length) {
					// NOTE: what was previousLandmarkEntry will've been wired up to point ot the start.
					if (lastEntryInSubTree) lastEntryInSubTree.next = newBitOfLevel[0]
					if (startInsertingAt === 0) {
						newBitOfLevel.at(-1).next = subtreeLevel[newBitOfLevel.length]
					} else {
						newBitOfLevel.at(-1).next = previousNext
					}
				}
			} else {
				// Any landmarks found can just be added to the level (list).
				let previousLandmarkEntry
				if (index === null) {
					previousLandmarkEntry = landmarksList[0]
				} else {
					for (let i = 0; i < landmarksList.length; i++) {
						if (landmarksList[i].element === found) {
							previousLandmarkEntry = landmarksList[i]
							break
						}
					}
				}
				const previousNext = previousLandmarkEntry?.next
				getLandmarksForSubtreeLevelOrPartThereof(mutation.addedNodes, subtreeLevel, previousLandmarkEntry)
				if (subtreeLevel.length) {
					// NOTE: what was previousLandmarkEntry will've been wired up to point ot the start.
					subtreeLevel.at(-1).next = previousNext
				}
				// FIXME: DRY with above
			}

			regenerateListIndicesSelectors()  // FIXME: do this across removed AND added
		}
	}

	function getLandmarksForSubtreeLevelOrPartThereof(addedNodes, level, pLE) {
		const origLen = level.length
		if (useHeuristics) tryHeuristics()  // FIXME: should we?
		for (let i = 0; i < addedNodes.length; i++) {
			// FIXME: Test
			if (level.length === origLen) {
				getLandmarks(addedNodes[i], level, pLE)
			} else {
				getLandmarks(addedNodes[i], level, level.at(-1))
			}
		}
	}

	function nextNotInSubTree(subTreeStartIndex) {
		const element = landmarksList[subTreeStartIndex].element
		let next = null
		for (let i = subTreeStartIndex + 1; i < landmarksList.length; i++) {
			const listNext = landmarksList[i]
			const rels = element.compareDocumentPosition(listNext.element)
			// eslint-disable-next-line no-bitwise
			const contained = rels & win.Node.DOCUMENT_POSITION_CONTAINED_BY
			if (!contained) {
				next = listNext
				break
			}
		}
		return next
	}

	function lastEntryInsideEntrySubtree(entry) {
		const subTreeRoot = entry.element
		let lastKnownContainedEntry = entry
		let current = entry

		while (current.next) {
			current = current.next
			const rels = subTreeRoot.compareDocumentPosition(current.element)
			// eslint-disable-next-line no-bitwise
			if (rels & win.Node.DOCUMENT_POSITION_CONTAINED_BY) {
				lastKnownContainedEntry = current
			} else {
				return lastKnownContainedEntry
			}
		}

		return lastKnownContainedEntry
	}

	function regenerateListIndicesSelectors() {
		// TODO: test different string syntax for performance
		for (const el of doc.querySelectorAll(`[${LANDMARK_INDEX_ATTR}]`)) {
			el.removeAttribute(LANDMARK_INDEX_ATTR)
		}

		landmarksList = []
		walk(landmarksList, landmarksTree)

		if (landmarksList.length) landmarksList.at(-1).next = landmarksTree[0]
		if (useDevMode) developerModeChecks()

		for (let i = 0; i < landmarksList.length; i++) {
			landmarksList[i].index = i
			landmarksList[i].element.setAttribute(LANDMARK_INDEX_ATTR, i)
			// TODO: When is this needed?
			//       - if we only added or removed landmarks AFTER this one.
			landmarksList[i].selector = createSelector(landmarksList[i].element)
		}

		cachedFilteredTree = null
		cachedAllInfos = null
		cachedAllElementInfos = null
	}

	// TODO: test and improve performance
	function handleAttributeMutation(mutation) {
		console.log(mutation)
		find()
	}

	// FIXME: test
	function foundLandmarkElementIndex(candidate) {
		if (!candidate.hasAttribute(LANDMARK_INDEX_ATTR)) return null  // FIXME: addd for handling addednOdes mutation - should this check be done there?
		const number = Number(candidate.getAttribute(LANDMARK_INDEX_ATTR))
		if (isNaN(number)) {
			console.error(`Index ${number} from attribute is NaN`)
			return null
		}
		if (number < 0 || number > (landmarksList.length - 1)) {
			console.error(`Index ${number} from attribute is out of range`)
			return null
		}
		if (landmarksList[number].element !== candidate) {
			console.error(`Landmark at ${number} isn't the found element.`)
			return null
		}
		return number
	}

	// FIXME: test this and/or wider
	function walk(list, root) {
		let entry = root?.[0]
		while (entry) {
			// FIXME: is this clause used?
			if (entry.element.isConnected) {
				list.push(entry)
			}
			entry = entry.next
		}
	}

	// TODO: DRY with getIndexOfLandmarkBefore()? Test performance.
	// FIXME: if all of them are _after_ return -1 (makes calling code easier)
	function getIndexOfLandmarkBefore2(element, list) {
		for (let i = list.length - 1; i >= 0; i--) {
			const rels =
				element.compareDocumentPosition(list[i].element)
			// eslint-disable-next-line no-bitwise
			if (rels & win.Node.DOCUMENT_POSITION_PRECEDING) return i
		}
		return null
	}

	function removeLandmarkFromTree(landmarkElement) {
		const index = foundLandmarkElementIndex(landmarkElement)
		if (index === null) return
		const info = landmarksList[index]
		const level = info.level

		// FIXME: PERF: If we were using a real tree, with pointers, this would not be needed.
		let levelIndex = null
		for (let i = 0; i < level.length; i++) {
			if (level[i].element === landmarkElement) {
				levelIndex = i
				break
			}
		}

		const next = levelIndex < level.length - 1
			? level[levelIndex + 1]
			: nextNotInSubTree(index)

		level.splice(levelIndex, 1)

		if (index > 0) {
			landmarksList[index - 1].next = next
		} else {
			// The first thing in the tree was removed
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

	// Stringify the tree for debugging

	let debugTreeString = '\n'

	// eslint-disable-next-line no-unused-vars
	function debugTree() {
		debugTreeCore(landmarksTree, 0)
		console.log(debugTreeString)
	}

	function debugTreeCore(tree, depth) {
		for (const thing of tree) {
			debugTreeString += '~ '.repeat(depth) + infoString(thing) + '\n'
			debugTreeCore(thing.contains, depth + 1)
		}
	}

	function infoString(entry) {
		// eslint-disable-next-line no-unused-vars
		const { previous, next, element, contains, level, ...info } = entry
		return JSON.stringify(info, null, 2)
	}


	//
	// Public API
	//

	this.find = find
	this.getNumberOfLandmarks = () => landmarksList.length

	// This includes the selector, warnings, everything except the element.
	// Used by the UI.
	// FIXME: actually only used by debugging stuff, which needs to use tree instead...
	this.allInfos = function() {
		if (!cachedAllInfos) {
			cachedAllInfos = landmarksList.map(entry => {
				// eslint-disable-next-line no-unused-vars
				const { element, contains, previous, next, level, ...info } = entry
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
				const { contains, previous, next, level, ...info } = entry
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

	this.pageResults = function() {
		return useDevMode ? _pageWarnings : null
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

	this.getCurrentlySelectedIndex = function() {
		return currentlySelectedIndex
	}

	// TODO: Rename this and the above
	this.getLandmarkElementInfoWithoutUpdatingIndex = function(index) {
		return landmarksList[index]
	}

	this.handleMutations = handleMutations
	this.debugHandleMutations = debugWrap(handleMutations)
	this.debugMutationHandlingTimes = () => debugMutationHandlingTimes
	this.clearDebugMutationHandlingTimes = () => debugMutationHandlingTimes = []
}
