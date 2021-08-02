/* eslint-disable no-prototype-builtins */
export default function LandmarksFinder(win, doc, useHeuristics) {
	//
	// Constants
	//

	// List of landmarks to navigate
	const regionTypes = Object.freeze([
		// Core ARIA
		'banner',
		'complementary',
		'contentinfo',
		'form',           // spec says should label
		'main',
		'navigation',
		'region',         // spec says must label
		'search',

		// Digital Publishing ARIA module
		'doc-acknowledgments',
		'doc-afterword',
		'doc-appendix',
		'doc-bibliography',
		'doc-chapter',
		'doc-conclusion',
		'doc-credits',
		'doc-endnotes',
		'doc-epilogue',
		'doc-errata',
		'doc-foreword',
		'doc-glossary',
		'doc-index',         // via navigation
		'doc-introduction',
		'doc-pagelist',      // via navigation
		'doc-part',
		'doc-preface',
		'doc-prologue',
		'doc-toc'            // via navigation
	])

	// Mapping of HTML5 elements to implicit roles
	const implicitRoles = Object.freeze({
		ASIDE:   'complementary',
		FOOTER:  'contentinfo',    // depending on its ancestor elements
		FORM:    'form',
		HEADER:  'banner',         // depending on its ancestor elements
		MAIN:    'main',
		NAV:     'navigation',
		SECTION: 'region'
	})

	// Sectioning content elements
	const sectioningContentElements = Object.freeze([
		'ARTICLE',
		'ASIDE',
		'NAV',
		'SECTION'
	])

	// Non-<body> sectioning root elements
	const nonBodySectioningRootElements = Object.freeze([
		'BLOCKQUOTE',
		'DETAILS',
		'FIELDSET',
		'FIGURE',
		'TD'
	])

	// non-<body> sectioning elements and <main>
	const nonBodySectioningElementsAndMain = Object.freeze(
		sectioningContentElements.concat(nonBodySectioningRootElements, 'MAIN')
	)


	//
	// Found landmarks
	//

	let landmarks = []
	// Each member of this array is an object of the form:
	//   depth (int)                     -- indicates nesting of landmarks
	//   role (string)                   -- the ARIA role
	//   roleDescription (string | null) -- custom role description
	//   label (string | null)           -- associated label
	//   selector (string)               -- CSS selector path of element
	//   element (HTML*Element)          -- in-memory element
	//   guessed (bool)                  -- landmark was gathered by heuristic
	// and, in developer mode:
	//   warnings [string]               -- list of warnings about this element

	let _pageWarnings = MODE === 'developer' ? [] : null
	const _unlabelledRoleElements = MODE === 'developer' ? new Map() : null
	let _visibleMainElements = MODE === 'developer' ? [] : null


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
		if (landmarks.length === 0) return
		currentlySelectedIndex = index
		currentlySelectedElement = landmarks[index].element
		return {
			element: currentlySelectedElement,
			role: landmarks[index].role,
			roleDescription: landmarks[index].roleDescription,
			label: landmarks[index].label,
			guessed: landmarks[index].guessed
			// No need to send the selector or warnings
		}
	}


	//
	// Finding landmarks
	//

	// Recursive function for building list of landmarks from a root element
	function getLandmarks(element, depth, parentLandmark) {
		if (isVisuallyHidden(element) || isSemantiallyHidden(element)) return

		// Support HTML5 elements' native roles
		let role = getRoleFromTagNameAndContainment(element)
		let explicitRole = false

		// Elements with explicitly-set rolees
		if (element.getAttribute) {
			const tempRole = element.getAttribute('role')
			if (tempRole) {
				role = tempRole
				explicitRole = true
			}
		}

		// The element may or may not have a label
		const label = getARIAProvidedLabel(element)

		// Add the element if it should be considered a landmark
		if (role && isLandmark(role, explicitRole, label)) {
			if (parentLandmark && parentLandmark.contains(element)) {
				depth = depth + 1
			}

			landmarks.push({
				'depth': depth,
				'role': role,
				'roleDescription': getRoleDescription(element),
				'label': label,
				'element': element,
				'selector': createSelector(element),
				'guessed': false
			})

			if (MODE === 'developer') {
				landmarks[landmarks.length - 1].warnings = []

				if (!label) {
					if (!_unlabelledRoleElements.has(role)) {
						_unlabelledRoleElements.set(role, [])
					}
					_unlabelledRoleElements.get(role).push(element)
				}

				if (role === 'main'
					&& explicitRole === false
					&& !isVisuallyHidden(element)) {
					_visibleMainElements.push(element)
				}
			}

			// Was this element selected before we were called (i.e.
			// before the page was dynamically updated)?
			if (currentlySelectedElement === element) {
				currentlySelectedIndex = landmarks.length - 1
			}

			// There should only be one main region, but pages may be bad and
			// wrong, so catch 'em all...
			if (role === 'main') {
				mainElementIndices.push(landmarks.length - 1)
			}

			parentLandmark = element
		}

		// One just one page I've seen an error here in Chrome (91) which seems
		// to be a bug, because only one HTMLElement was returned; not an
		// HTMLCollection. Checking for this would cause a slowdown, so
		// ignoring for now.
		for (const elementChild of element.children) {
			getLandmarks(elementChild, depth, parentLandmark)
		}
	}

	function getARIAProvidedLabel(element) {
		let label = null

		// TODO general whitespace test?
		const idRefs = element.getAttribute('aria-labelledby')
		if (idRefs !== null && idRefs.length > 0) {
			const innerTexts = Array.from(idRefs.split(' '), idRef => {
				const labelElement = doc.getElementById(idRef)
				return getInnerText(labelElement)
			})
			label = innerTexts.join(' ')
		}

		if (label === null) {
			label = element.getAttribute('aria-label')
		}

		return label
	}

	function isLandmark(role, explicitRole, label) {
		// <section> and <form> are only landmarks when labelled.
		// <div role="form"> is always a landmark.
		if (role === 'region' || (role === 'form' && !explicitRole)) {
			return label !== null
		}

		// Is the role (which may've been explicitly set) a valid landmark type?
		return regionTypes.includes(role)
	}

	function getInnerText(element) {
		let text = null

		if (element) {
			text = element.innerText
			if (text === undefined) {
				text = element.textContent
			}
		}

		return text
	}

	function getRoleFromTagNameAndContainment(element) {
		const name = element.tagName
		let role = null

		if (name) {
			if (implicitRoles.hasOwnProperty(name)) {
				role = implicitRoles[name]
			}

			// <header> and <footer> elements have some containment-
			// related constraints on whether they're counted as landmarks
			if (name === 'HEADER' || name === 'FOOTER') {
				if (!isChildOfTopLevelSection(element)) {
					role = null
				}
			}
		}

		return role
	}

	function getRoleDescription(element) {
		const roleDescription = element.getAttribute('aria-roledescription')
		// TODO make this a general whitespace check?
		if (/^\s*$/.test(roleDescription)) {
			return null
		}
		return roleDescription
	}

	function isChildOfTopLevelSection(element) {
		let ancestor = element.parentNode

		while (ancestor !== null) {
			if (nonBodySectioningElementsAndMain.includes(ancestor.tagName)) {
				return false
			}
			ancestor = ancestor.parentNode
		}

		return true
	}

	function isVisuallyHidden(element) {
		const style = win.getComputedStyle(element)
		if (element.hasAttribute('hidden')
			|| style.visibility === 'hidden'
			|| style.display === 'none' ) {
			return true
		}
		return false
	}

	function isSemantiallyHidden(element) {
		if (element.getAttribute('aria-hidden') === 'true'
			|| (element.hasAttribute('inert')
				&& element.getAttribute('inert') !== 'false')) {
			return true
		}
		return false
	}

	function createSelector(element) {
		const reversePath = []
		let node = element

		while (node.tagName !== 'HTML') {
			const tag = node.tagName.toLowerCase()
			const id = node.id
			const klass = node.classList.length > 0 ? node.classList[0] : null

			let description

			if (id) {
				description = '#' + id
			} else {
				// If the element tag is not unique amongst its siblings, then
				// we'll need to include an nth-child bit on the end of the
				// selector part for this element.
				const siblingElementTagNames =
					Array.from(node.parentNode.children, x => x.tagName)
				const uniqueSiblingElementTagNames =
					[...new Set(siblingElementTagNames)]  // Array API is neater

				// Include element's class if need be.
				// TODO this probably isn't needed as we have nth-child.
				if (klass) {
					description = tag + '.' + klass
				} else {
					description = tag
				}

				if (siblingElementTagNames.length
					> uniqueSiblingElementTagNames.length) {
					const siblingNumber =
						Array.prototype.indexOf.call(
							node.parentNode.children, node) + 1

					description += ':nth-child(' + siblingNumber + ')'
				}
			}

			reversePath.push(description)
			if (id) break
			node = node.parentNode
		}

		return reversePath.reverse().join(' > ')
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

		for (const landmark of landmarks) {
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
			'depth': 0,
			'role': role,
			'roleDescription': getRoleDescription(guessed),
			'label': getARIAProvidedLabel(guessed),
			'element': guessed,
			'selector': createSelector(guessed),
			'guessed': true
		}
	}

	function addGuessed(guessed, role) {
		if (guessed) {
			if (landmarks.length === 0) {
				landmarks.push(makeLandmarkEntry(guessed, role))
				if (role === 'main') mainElementIndices = [0]
			} else {
				const insertAt =
					getIndexOfLandmarkAfter(guessed) ?? landmarks.length
				landmarks.splice(
					insertAt, 0, makeLandmarkEntry(guessed, role))
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
		for (let i = 0; i < landmarks.length; i++) {
			const rels = element.compareDocumentPosition(landmarks[i].element)
			// eslint-disable-next-line no-bitwise
			if (rels & win.Node.DOCUMENT_POSITION_FOLLOWING) return i
		}
		return null
	}

	function getIndexOfLandmarkBefore(element) {
		for (let i = landmarks.length - 1; i >= 0; i--) {
			const rels = element.compareDocumentPosition(landmarks[i].element)
			// eslint-disable-next-line no-bitwise
			if (rels & win.Node.DOCUMENT_POSITION_PRECEDING) return i
		}
		return null
	}


	//
	// Public API
	//

	this.find = function() {
		if (MODE === 'developer') {
			_pageWarnings = []
			_unlabelledRoleElements.clear()
			_visibleMainElements = []
		}

		landmarks = []
		mainElementIndices = []
		mainIndexPointer = -1
		foundNavigationRegion = false
		currentlySelectedIndex = -1
		getLandmarks(doc.body.parentNode, 0, null)  // supports role on <body>

		if (MODE === 'developer') developerModeChecks()
		if (useHeuristics) tryHeuristics()
	}

	this.getNumberOfLandmarks = function() {
		return landmarks.length
	}

	// This includes the selector, warnings, everything except the element
	this.allInfos = () => landmarks.map(landmark => {
		// eslint-disable-next-line no-unused-vars
		const { element, ...info } = landmark
		return info
	})

	this.allElementsInfos = function() {
		return landmarks.slice()  // TODO: Need a copy?
	}

	if (MODE === 'developer') {
		this.pageResults = function() {
			return _pageWarnings
		}
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
			(currentlySelectedIndex + 1) % landmarks.length)
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
				landmarks.length - 1 : currentlySelectedIndex - 1)
	}

	this.getLandmarkElementInfo = function(index) {
		return updateSelectedAndReturnElementInfo(index)
	}

	// If pages are naughty and have more than one 'main' region, we cycle
	// betwixt them.
	this.getMainElementInfo = function() {
		if (mainElementIndices.length > 0) {
			mainIndexPointer = (mainIndexPointer + 1) % mainElementIndices.length
			const mainElementIndex = mainElementIndices[mainIndexPointer]
			return updateSelectedAndReturnElementInfo(mainElementIndex)
		}
		return null
	}
}
