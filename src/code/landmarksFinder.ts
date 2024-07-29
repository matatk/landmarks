// FIXME: if useHeuristics changes, undo the guessing!
// FIXME: flag elements added on the last getLandmarks() pass, so that the
//        selector only needs to be computed for the other ones.
import {
	isVisuallyHidden,
	isSemantiallyHidden,
	getARIAProvidedLabel,
	isLandmark,
	getRoleDescription,
	createSelector,
	getRole
} from './landmarksFinderDOMUtils.js'

const LANDMARK_INDEX_ATTR = 'data-landmark-index'
const LANDMARK_GUESSED_ATTR = 'data-landmark-guessed'

function isHTMLElement(node: Node): node is HTMLElement {
	return node.nodeType === Node.ELEMENT_NODE
}

function isBoolean(name: string, value: unknown): asserts value is boolean {
	if (typeof value !== 'boolean') {
		// FIXME remove need for:
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		throw Error(`${name}() given ${typeof value} value: ${value}`)
	}
}


export default class LandmarksFinder {
	#win: Window
	#doc: Document
	#useHeuristics: boolean  // parameter is only used by tests
	#useDevMode: boolean     // parameter is only used by tests
	#debugMutationHandlingTimes: number[] = []
	#debugTreeString = '\n'  // FIXME clear when?


	//
	// Found landmarks
	//

	#landmarksTree!: LandmarkEntry[]
	#landmarksList!: LandmarkEntry[]

	// Tracking landmark finding
	#cachedFilteredTree?: FilteredLandmarkTreeEntry[]
	#cachedAllInfos?: FilteredLandmarkEntry[]
	#cachedAllElementInfos?: LandmarkElementInfo[]

	// Tracking landmark finding in developer mode
	#pageWarnings!: PageWarning[]
	#unlabelledRoleElements: Map<string, Element[]>
	#visibleMainElements!: HTMLElement[]


	//
	// Keeping track of landmark navigation
	//

	#currentlySelectedIndex!: number     // the landmark currently having focus/border
	#mainElementIndices!: number[]  // if we find <main> or role="main" ele
	#mainIndexPointer!: number           // allows us to cylce through main regions

	// Keep a reference to the currently-selected element in case the page
	// changes and the landmark is still there, but has moved within the list.
	#currentlySelectedElement!: HTMLElement

	constructor(win: Window, _useHeuristics?: boolean, _useDevMode?: boolean) {	
		this.#win = win
		this.#doc = win.document
		this.#useDevMode = Boolean(_useDevMode)
		this.#useHeuristics = Boolean(_useHeuristics)
		this.#unlabelledRoleElements = new Map()
		this.reset() // https://github.com/microsoft/TypeScript/issues/21132
	}

	updateSelectedAndReturnElementInfo(index: number) {
		// TODO: Don't need an index check, as we trust the source. Does that
		//       mean we also don't need the length check?
		// TODO: The return can be massively simplified, rite?
		if (this.#landmarksList.length === 0) return
		this.#currentlySelectedIndex = index
		this.#currentlySelectedElement = this.#landmarksList[index].element
		return {
			element: this.#currentlySelectedElement,
			role: this.#landmarksList[index].role,
			roleDescription: this.#landmarksList[index].roleDescription,
			label: this.#landmarksList[index].label,
			guessed: this.#landmarksList[index].guessed
			// No need to send the selector or warnings
		}
	}


	//
	// Finding landmarks
	//

	reset() {
		this.#landmarksTree = []
		this.#landmarksList = []
		this.#cachedFilteredTree = undefined
		this.#cachedAllInfos = undefined
		this.#cachedAllElementInfos = undefined

		if (this.#useDevMode) {
			this.#pageWarnings = []
			this.#unlabelledRoleElements.clear()
			this.#visibleMainElements = []
		}

		this.#mainElementIndices = []
		this.#mainIndexPointer = -1
		this.#currentlySelectedIndex = -1
	}

	// TODO: DRY with regenerateListIndicesSelectors()
	find() {
		this.reset()

		// FIXME: only on page startup?
		if (this.#useHeuristics) this.tryHeuristics()

		this.getLandmarks(this.#doc.body.parentElement!, this.#landmarksTree)
		if (this.#useDevMode) this.developerModeChecks()

		// TODO: test different string syntax for performance
		for (const el of this.#doc.querySelectorAll(`[${LANDMARK_INDEX_ATTR}]`)) {
			el.removeAttribute(LANDMARK_INDEX_ATTR)
		}

		this.#landmarksList = []
		this.walk(this.#landmarksList, this.#landmarksTree)
		for (let i = 0; i < this.#landmarksList.length; i++) {
			this.#landmarksList[i].index = i
			this.#landmarksList[i].element.setAttribute(LANDMARK_INDEX_ATTR, String(i))
			// NOTE: We did a full find, so we don't need to update any selectors.
		}

		if (this.#landmarksList.length) this.#landmarksList.at(-1)!.next = this.#landmarksTree[0]
	}

	getLandmarks(element: HTMLElement, thisLevel: LandmarkEntry[], previousLandmarkEntry?: LandmarkEntry) {
		if (isVisuallyHidden(this.#win, element) || isSemantiallyHidden(element)) {
			return previousLandmarkEntry
		}

		// Get implicit or explicit role
		// TODO: Perf: needed to speed this up? How?
		const { hasExplicitRole, role } = getRole(element)

		// The element may or may not have a label
		const label = getARIAProvidedLabel(this.#doc, element)

		// Add the element if it should be considered a landmark
		let thisLandmarkEntry: LandmarkEntry | null = null
		if (role && isLandmark(role, hasExplicitRole, label)) {
			thisLandmarkEntry = {
				'type': 'landmark',
				'role': role,
				'roleDescription': getRoleDescription(element) ?? null,
				'label': label ?? null,
				'element': element,
				'selector': createSelector(element),
				'selectorWasUpdated': true,
				'guessed': element.hasAttribute(LANDMARK_GUESSED_ATTR),
				'contains': [],
				'next': undefined,
				'level': thisLevel,
				'debug': element.tagName + '(' + role + ')'  // FIXME: un-need?
			}

			if (previousLandmarkEntry) {
				previousLandmarkEntry.next = thisLandmarkEntry
			}

			thisLevel.push(thisLandmarkEntry)

			if (this.#useDevMode) {
				thisLandmarkEntry.warnings = []

				if (!label) {
					if (!this.#unlabelledRoleElements.has(role)) {
						this.#unlabelledRoleElements.set(role, [])
					}
					this.#unlabelledRoleElements.get(role)!.push(element)
				}

				if (role === 'main' && !hasExplicitRole) {
					this.#visibleMainElements.push(element)
				}
			}

			// Was this element selected before we were called (i.e.
			// before the page was dynamically updated)?
			if (this.#currentlySelectedElement === element) {
				// FIXME: not working also?
				this.#currentlySelectedIndex = this.#landmarksList.length - 1
			}

			// There should only be one main region, but pages may be bad and
			// wrong, so catch 'em all...
			if (role === 'main') {
				// FIXME: not working because we're only populating the list later?
				this.#mainElementIndices.push(this.#landmarksList.length - 1)
				// FIXME: push the element to a list of main elements instead? Should only store reference.
			}
		}

		// One just one page I've seen an error here in Chrome (91) which seems
		// to be a bug, because only one HTMLElement was returned; not an
		// HTMLCollection. Checking for this would cause a slowdown, so
		// ignoring for now.
		previousLandmarkEntry = thisLandmarkEntry ?? previousLandmarkEntry
		for (const elementChild of element.children) {  // TODO: perf
			if (!isHTMLElement(elementChild)) continue  // TODO: perf
			previousLandmarkEntry = this.getLandmarks(
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

	developerModeChecks() {
		const _duplicateUnlabelledWarnings = this.getDuplicateUnlabelledWarnings()

		if (this.#mainElementIndices.length === 0) {
			this.#pageWarnings.push('lintNoMain')
		}

		if (this.#mainElementIndices.length > 1) {
			this.#pageWarnings.push('lintManyMains')
		}

		for (const landmark of this.#landmarksList) {  // TODO: perf
			// TODO: will this always be true?
			if (!Array.isArray(landmark.warnings)) {
				landmark.warnings = []
			}

			if (this.#visibleMainElements.length > 1
				&& this.#visibleMainElements.includes(landmark.element)) {
				landmark.warnings.push('lintManyVisibleMainElements')
			}

			// FIXME: There must be a bettger way than checking, then telling TS we checked
			if (_duplicateUnlabelledWarnings.has(landmark.element)) {
				landmark.warnings.push(
					_duplicateUnlabelledWarnings.get(landmark.element)!)
			}
		}
	}

	getDuplicateUnlabelledWarnings() {
		// TODO: Make HTMLElement
		const _duplicateUnlabelledWarnings = new Map<Element, PageWarning>()
		for (const elements of this.#unlabelledRoleElements.values()) {  // TODO: prf
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
	tryFindingMain() {
		if (this.#doc.querySelector('main, [role="main"]')) return

		for (const id of ['main', 'content', 'main-content']) {
			const element = this.#doc.getElementById(id)
			if (element?.innerText) {
				element.setAttribute('role', 'main')
				element.setAttribute(LANDMARK_GUESSED_ATTR, '')
				return
			}
		}

		// TODO: classMains is only used here - just do the [0] on the gEBCN instead?
		const classMains = this.#doc.getElementsByClassName('main')
		if (classMains.length === 1 && isHTMLElement(classMains[0]) && classMains[0].innerText) {
			classMains[0].setAttribute('role', 'main')
			classMains[0].setAttribute(LANDMARK_GUESSED_ATTR, '')
		}
	}

	// FIXME: editing these attrs will trigger mutations
	tryFindingNavs() {
		if (this.#doc.querySelector('nav, [role="navigation"]')) return

		for (const id of ['navigation', 'nav']) {
			const element = this.#doc.getElementById(id)
			if (element?.innerText) {
				element.setAttribute('role', 'navigation')
				element.setAttribute(LANDMARK_GUESSED_ATTR, '')
				break
			}
		}

		for (const className of ['navigation', 'nav']) {
			// TODO: perf?
			for (const element of this.#doc.getElementsByClassName(className)) {
				if (isHTMLElement(element) && element.innerText) {
					element.setAttribute('role', 'navigation')
					element.setAttribute(LANDMARK_GUESSED_ATTR, '')
				}
			}
		}
	}

	tryHeuristics() {
		this.tryFindingMain()
		this.tryFindingNavs()
	}


	//
	// Support for finding next landmark from focused element
	//

	getIndexOfLandmarkAfter(element: HTMLElement) {
		for (let i = 0; i < this.#landmarksList.length; i++) {
			const rels =
				element.compareDocumentPosition(this.#landmarksList[i].element)
			// eslint-disable-next-line no-bitwise
			if (rels & Node.DOCUMENT_POSITION_FOLLOWING) return i
		}
		return null
	}

	// FIXME: if all of them are _after_ return -1 (makes calling code easier)
	getIndexOfLandmarkBeforeIn(element: HTMLElement, list: LandmarkEntry[]) {
		for (let i = list.length - 1; i >= 0; i--) {
			const rels =
				element.compareDocumentPosition(list[i].element)
			// eslint-disable-next-line no-bitwise
			if (rels & Node.DOCUMENT_POSITION_PRECEDING) return i
		}
		return null
	}

	getIndexOfLandmarkBefore(element: HTMLElement) {
		return this.getIndexOfLandmarkBeforeIn(element, this.#landmarksList)
	}


	//
	// Support for public API
	//

	// FIXME: un-need 'debug' field
	// TODO: should filtered entry contain warnings? and index? too?
	filterTree(subtree: LandmarkEntry[]): FilteredLandmarkTreeEntry[] {
		const filteredLevel = []

		for (const entry of subtree) {  // TODO: perf?
			// FIXME remove this:
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { contains, element, previous, next, debug, level, selectorWasUpdated, ...info } = entry
			const filteredEntry: FilteredLandmarkTreeEntry = { contains: this.filterTree(contains), ...info }
			filteredLevel.push(filteredEntry)
		}

		return filteredLevel
	}


	//
	// Handling mutations; debugging handling mutations
	//

	// FIXME: Need to deal with main indices, dev warnings, etc.
	handleMutations(mutations: MutationRecord[]) {
		for (const mutation of mutations) {  // TODO: perf
			switch (mutation.type) {
				case 'childList':
					this.handleChildListMutation(mutation)
					break
				case 'attributes':
					this.handleAttributeMutation(mutation)
					break
			}
		}
	}

	debugHandleMutations(mutations: MutationRecord[]) {
		const start = this.#win.performance.now()
		this.handleMutations(mutations)
		const end = this.#win.performance.now()
		this.#debugMutationHandlingTimes.push(end - start)
	}

	// NOTE: Sometimes this appears to get both additions and removals.
	handleChildListMutation(mutation: MutationRecord) {
		if (!isHTMLElement(mutation.target)) return  // TODO: perf
		
		// Quick path for when there are no landmarks

		if (this.#landmarksList.length === 0) {
			// FIXME: DRY with subtreeLevel added nodes below?
			if (mutation.addedNodes.length) {
				if (this.#useHeuristics) this.tryHeuristics()  // NOTE: only after haindling mutation - but that means OK here

				// FIXME: check performance with a for-of loop
				// eslint-disable-next-line
				for (let i = 0; i < mutation.addedNodes.length; i++) {
					// TODO: This pleases TS but is fiddly
					const thing = mutation.addedNodes[i]
					if (isHTMLElement(thing)) {
						this.getLandmarks(thing, this.#landmarksTree)
					}
				}

				this.regenerateListIndicesSelectors()
			}
			return  // don't need to worry about removing when 0 landmarks
		}

		// The slower path

		// TODO: use an else so the ! isn't needed?
		this.#landmarksList.at(-1)!.next = undefined // stop at end of tree walk
		let processed = false

		if (mutation.removedNodes.length) {
			processed = this.handleChildListMutationRemove(mutation.removedNodes)
		}

		// NOTE: Assumes addedNodes are encountered in DOM order.
		if (mutation.addedNodes.length) {
			processed = this.handleChildListMutationAdd(mutation.target, mutation.addedNodes)
		}

		// FIXME: what happens if we didn't process anything, to the selector
		//        update thing? I think it is still working right becuase the
		//        tests got faster...
		if (processed) {
			this.regenerateListIndicesSelectors()
		} else {
			// FIXME: used to only do this if we processed some stuff, but if a labelleing element was removed or modified, we need to do it anyway...
			this.regenerateListIndicesSelectors()
		}
	}

	handleChildListMutationRemove(removedNodes: NodeList) {
		let processed = false

		for (const removed of removedNodes) {  // TODO: perf
			if (!isHTMLElement(removed)) continue
			// TODO: How likely is it that precisely a landmark will be removed?
			if (removed.hasAttribute(LANDMARK_INDEX_ATTR)) {
				// A landmark was removed
				this.removeLandmarkFromTree(removed)
				processed = true
			} else {
				// A non-landmark was removed; find and remove the landmarks within
				let previous = null
				let current = null
				// FIXME - if this is not ignored, another error happens
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
				while ((current = removed.querySelector(`[${LANDMARK_INDEX_ATTR}]`)! as HTMLElement) !== null) {
					// If the next one we find was inside the previous one; it's already been processed.
					if (previous) {
						const rels = previous.compareDocumentPosition(current)
						// eslint-disable-next-line no-bitwise
						if (rels & Node.DOCUMENT_POSITION_CONTAINED_BY) {
							current.removeAttribute(LANDMARK_INDEX_ATTR)
							continue
						}
					}
					this.removeLandmarkFromTree(current)
					processed = true
					current.removeAttribute(LANDMARK_INDEX_ATTR)
					previous = current
				}
			}
		}

		return processed
	}

	// TODO: perf of doing this
	// TODO: inline this - check perf
	htmlElementsFromNodes(nodes: NodeList): HTMLElement[] {
		return Array.from(nodes).filter(isHTMLElement)
	}

	handleChildListMutationAdd(target: HTMLElement, addedNodes: NodeList) {
		// Find the nearest parent landmark, if any
		let found = target
		while (!found.hasAttribute(LANDMARK_INDEX_ATTR) && found !== this.#doc.body) {
			found = found.parentNode! as HTMLElement
		}

		// From the parent landmark (if any), work out which subtree level we're at
		const index = this.foundLandmarkElementIndex(found)
		let subtreeLevel: LandmarkEntry[]
		if (index === null) {
			if (found !== this.#doc.body) {
				console.error("Can't find tree level; full find() needed")
				this.find()  // FIXME: TEST
				return false // FIXME: is this what I intended to return when a find() had to be done?
			}
			// FIXME: why should this happen? Shirley if the body is a landmark, we put an index on it? So if index is null, it's always an error?
			subtreeLevel = this.#landmarksTree
		} else {
			subtreeLevel = this.#landmarksList[index].contains
		}

		const added = this.htmlElementsFromNodes(addedNodes)

		// If there are other landmarks at this level of the tree, they're
		// siblings (or we'd be inside of them). We can avoid scanning inside,
		// and replacing, any siblings.
		if (subtreeLevel.length) {
			const before = this.getIndexOfLandmarkBeforeIn(added[0], subtreeLevel)

			const startInsertingAt = before === null ? 0 : before + 1

			let previousLandmarkEntry
			if (before === null) {
				if (found === this.#doc.body) {
					previousLandmarkEntry = null
				} else if (index !== null) {
					previousLandmarkEntry = this.#landmarksList[index]
				} else {
					throw Error("landmark index shouldn't be null") // FIXME: shouldn't need this check
				}
			} else {
				previousLandmarkEntry = subtreeLevel[before]
			}

			const lastEntryInSubTree = previousLandmarkEntry
				? this.lastEntryInsideEntrySubtree(previousLandmarkEntry) : undefined
			const previousNext = lastEntryInSubTree?.next

			const newBitOfLevel: LandmarkEntry[] = []
			this.getLandmarksForSubtreeLevelOrPartThereof(added, newBitOfLevel, lastEntryInSubTree)
			subtreeLevel.splice(startInsertingAt, 0, ...newBitOfLevel)

			if (newBitOfLevel.length) {
				// NOTE: what was previousLandmarkEntrybefore this
				//       patching-up scan will've been wired up to point ot
				//       the start.
				if (lastEntryInSubTree) lastEntryInSubTree.next = newBitOfLevel[0]
				if (startInsertingAt === 0) {
					newBitOfLevel.at(-1)!.next = subtreeLevel[newBitOfLevel.length]
				} else {
					newBitOfLevel.at(-1)!.next = previousNext
				}
			}
		} else {
			// Any landmarks found can just be added to the level (list).
			const previousLandmarkEntry = this.#landmarksList.find(entry => entry.element === found)
			const previousNext = previousLandmarkEntry?.next
			this.getLandmarksForSubtreeLevelOrPartThereof(added, subtreeLevel, previousLandmarkEntry)
			if (subtreeLevel.length) {
				// NOTE: what was previousLandmarkEntrywill've been wired up to point ot the start.
				subtreeLevel.at(-1)!.next = previousNext
			}
		}

		return true  // FIXME: work out if we actually added any landmarks
	}

	getLandmarksForSubtreeLevelOrPartThereof(added: HTMLElement[], level: LandmarkEntry[], pLE?: LandmarkEntry) {
		const origLen = level.length
		if (this.#useHeuristics) this.tryHeuristics()  // FIXME: should we? - NO, DO IT AFTER HANDLING MUTATION
		// FIXME: check performance with a for-of loop
		// eslint-disable-next-line
		for (let i = 0; i < added.length; i++) {
			// FIXME: Test
			if (level.length === origLen) {
				this.getLandmarks(added[i], level, pLE)
			} else {
				this.getLandmarks(added[i], level, level.at(-1))
			}
		}
	}

	nextNotInSubTree(subTreeStartIndex: number) {
		const element = this.#landmarksList[subTreeStartIndex].element
		let next = null
		for (let i = subTreeStartIndex + 1; i < this.#landmarksList.length; i++) {
			const listNext = this.#landmarksList[i]
			const rels = element.compareDocumentPosition(listNext.element)
			// eslint-disable-next-line no-bitwise
			const contained = rels & Node.DOCUMENT_POSITION_CONTAINED_BY
			if (!contained) {
				next = listNext
				break
			}
		}
		return next
	}

	lastEntryInsideEntrySubtree(entry: LandmarkEntry) {
		const subTreeRoot = entry.element
		let lastKnownContainedEntry = entry
		let current = entry

		while (current.next) {
			current = current.next
			const rels = subTreeRoot.compareDocumentPosition(current.element)
			// eslint-disable-next-line no-bitwise
			if (rels & Node.DOCUMENT_POSITION_CONTAINED_BY) {
				lastKnownContainedEntry = current
			} else {
				return lastKnownContainedEntry
			}
		}

		return lastKnownContainedEntry
	}

	regenerateListIndicesSelectors() {
		// TODO: test different string syntax for performance
		for (const el of this.#doc.querySelectorAll(`[${LANDMARK_INDEX_ATTR}]`)) {
			el.removeAttribute(LANDMARK_INDEX_ATTR)
		}

		this.#landmarksList = []
		this.walk(this.#landmarksList, this.#landmarksTree)

		if (this.#landmarksList.length) this.#landmarksList.at(-1)!.next = this.#landmarksTree[0]
		if (this.#useDevMode) this.developerModeChecks()

		for (let i = 0; i < this.#landmarksList.length; i++) {
			this.#landmarksList[i].index = i
			this.#landmarksList[i].element.setAttribute(LANDMARK_INDEX_ATTR, String(i))

			if (!this.#landmarksList[i].selectorWasUpdated) {
				this.#landmarksList[i].selector = createSelector(this.#landmarksList[i].element)
			} else {
				this.#landmarksList[i].selectorWasUpdated = false
			}

			// TODO: Can we avoid the need to do this for all elements?
			this.#landmarksList[i].label = getARIAProvidedLabel(this.#doc, this.#landmarksList[i].element)
		}

		this.#cachedFilteredTree = []
		this.#cachedAllInfos = []
		this.#cachedAllElementInfos = []
	}

	handleAttributeMutation(mutation: MutationRecord) {
		const el = mutation.target as HTMLElement  // TODO: remove need for/do more cleverly
		if (el.hasAttribute(LANDMARK_INDEX_ATTR)) {
			const index = this.foundLandmarkElementIndex(el)
			if (index !== null) {
				switch (mutation.attributeName) {
					case 'role': {
						const { hasExplicitRole, role } = getRole(el)
						if (role && isLandmark(role, hasExplicitRole, this.#landmarksList[index].label)) {
							this.#landmarksList[index].role = role
							// FIXME: DRY with getLandmarks() or remove:
							this.#landmarksList[index].debug = el.tagName + '(' + role + ')'
						} else {
							// FIXME: remove landmark
							throw Error('Remove landmark (but not its children)')
						}
						break
					}
					case 'aria-roledescription':
						this.#landmarksList[index].roleDescription = el.getAttribute('aria-roledescription')
						break
				}
			} else {
				// FIXME
				throw Error("Couldn't find landmark index!")
			}
		}

		// FIXME: DRY with regenerateListIndicesSelectors() or something?
		this.#cachedFilteredTree = []
		this.#cachedAllInfos = []
		this.#cachedAllElementInfos = []
	}

	// FIXME: test
	foundLandmarkElementIndex(candidate: HTMLElement) {
		const value = candidate.getAttribute(LANDMARK_INDEX_ATTR)
		if (value === null) return null
		const number = Number(value)
		if (isNaN(number)) {
			console.error(`Index ${number} from attribute is NaN`)
			return null
		}
		if (number < 0 || number > (this.#landmarksList.length - 1)) {
			console.error(`Index ${number} from attribute is out of range`)
			return null
		}
		if (this.#landmarksList[number].element !== candidate) {
			console.error(`Landmark at ${number} isn't the found element.`)
			return null
		}
		return number
	}

	// FIXME: test this and/or wider
	walk(list: LandmarkEntry[], root: LandmarkEntry[]) {
		let entry = root?.[0]
		while (entry) {
			// FIXME: is this clause used?
			if (entry.element.isConnected) {
				list.push(entry)
			}
			entry = entry.next!
		}
	}

	removeLandmarkFromTree(landmarkElement: HTMLElement) {
		const index = this.foundLandmarkElementIndex(landmarkElement)
		if (index === null) return
		const info = this.#landmarksList[index]
		const level = info.level

		// FIXME: PERF: If we were using a real tree, with pointers, this would not be needed.
		let levelIndex = null
		for (let i = 0; i < level.length; i++) {
			if (level[i].element === landmarkElement) {
				levelIndex = i
				break
			}
		}

		if (levelIndex === null) {
			throw Error("levelIndex shouldn't be null")
		}

		const next = levelIndex < level.length - 1
			? level[levelIndex + 1]
			: this.nextNotInSubTree(index)

		level.splice(levelIndex, 1)

		if (index > 0) {
			if (!this.#landmarksList[index - 1]) {
				throw Error('element missing from landmark list') // FIXME: shouldn't need this check
			}
			if (next === null) {
				throw Error("couldn't find next landmark") // FIXME: shouldn't need this check
			}
			this.#landmarksList[index - 1].next = next
		} else {
			// The first thing in the tree was removed
		}
	}

	// Stringify the tree for debugging

	// FIXME
	debugTree() {
		this.debugTreeCore(this.#landmarksTree, 0)
		console.log(this.#debugTreeString)
	}

	debugTreeCore(tree: LandmarkEntry[], depth: number) {
		for (const thing of tree) {
			this.#debugTreeString += '~ '.repeat(depth) + this.infoString(thing) + '\n'
			this.debugTreeCore(thing.contains, depth + 1)
		}
	}

	infoString(entry: LandmarkEntry) {
		// FIXME remove this:
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { previous, next, element, contains, level, ...info } = entry
		return JSON.stringify(info, null, 2)
	}


	//
	// Public API
	//

	// FIXME: find is already delcared - make others private

	getNumberOfLandmarks() {
		return this.#landmarksList.length
	}

	// This includes the selector, warnings, everything except the element.
	// Used by the UI.
	// FIXME: actually only used by debugging stuff, which needs to use tree instead...
	allInfos() {
		if (!this.#cachedAllInfos) {
			this.#cachedAllInfos = this.#landmarksList.map(entry => {
				// FIXME remove this:
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { element, contains, previous, next, level, ...info } = entry
				return info
			})
		}
		return this.#cachedAllInfos
	}

	// As above, but also including the element. Used by the borderDrawer.
	allElementsInfos(): LandmarkElementInfo[] {
		if (!this.#cachedAllElementInfos) {
			this.#cachedAllElementInfos = this.#landmarksList.map(entry => {
				// FIXME remove this:
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { contains, previous, next, level, ...info } = entry
				return info
			})
		}
		return this.#cachedAllElementInfos
	}

	// Just the tree structure, in serialisable form
	tree() {
		if (!this.#cachedFilteredTree) {
			this.#cachedFilteredTree = this.filterTree(this.#landmarksTree)
		}
		return this.#cachedFilteredTree
	}

	pageResults() {
		return this.#useDevMode ? this.#pageWarnings : null
	}

	// These all return elements and their related info

	getNextLandmarkElementInfo(): LandmarkElementInfo | undefined {
		if (this.#doc.activeElement !== null && this.#doc.activeElement !== this.#doc.body && isHTMLElement(this.#doc.activeElement)) {  // TODO perf/inline
			const index = this.getIndexOfLandmarkAfter(this.#doc.activeElement)
			if (index !== null) {
				return this.updateSelectedAndReturnElementInfo(index)
			}
		}
		return this.updateSelectedAndReturnElementInfo(
			(this.#currentlySelectedIndex + 1) % this.#landmarksList.length)
	}

	getPreviousLandmarkElementInfo() {
		if (this.#doc.activeElement !== null && this.#doc.activeElement !== this.#doc.body && isHTMLElement(this.#doc.activeElement)) {  // TODO perf/inline
			const index = this.getIndexOfLandmarkBefore(this.#doc.activeElement)
			if (index !== null) {
				return this.updateSelectedAndReturnElementInfo(index)
			}
		}
		return this.updateSelectedAndReturnElementInfo(
			(this.#currentlySelectedIndex <= 0) ?
				this.#landmarksList.length - 1 : this.#currentlySelectedIndex - 1)
	}

	getLandmarkElementInfo(index: number): LandmarkElementInfo | undefined {
		return this.updateSelectedAndReturnElementInfo(index)
	}

	// If pages are naughty and have more than one 'main' region, we cycle
	// betwixt them.
	getMainElementInfo() {
		if (this.#mainElementIndices.length > 0) {
			this.#mainIndexPointer =
				(this.#mainIndexPointer + 1) % this.#mainElementIndices.length
			const mainElementIndex = this.#mainElementIndices[this.#mainIndexPointer]
			return this.updateSelectedAndReturnElementInfo(mainElementIndex)
		}
		return null
	}

	useHeuristics(use: unknown) {
		isBoolean('useHeuristics', use)
		this.#useHeuristics = use
	}

	useDevMode(use: unknown) {
		isBoolean('useDevMode', use)
		this.#useDevMode = use
	}

	getCurrentlySelectedIndex() {
		return this.#currentlySelectedIndex
	}

	// TODO: Rename this and the above
	// TODO: used?
	getLandmarkElementInfoWithoutUpdatingIndex(index: number) {
		return this.#landmarksList[index]
	}

	debugMutationHandlingTimes() {
		return this.#debugMutationHandlingTimes
	}

	clearDebugMutationHandlingTimes() {
		this.#debugMutationHandlingTimes = []
	}
}
