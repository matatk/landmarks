export default function LandmarksFinder(win, doc) {
	//
	// Constants
	//

	// List of landmarks to navigate
	const regionTypes = Object.freeze([
		// Core ARIA
		'banner',
		'complementary',
		'contentinfo',
		'form',           // should label
		'main',
		'navigation',
		'region',         // must label
		'search',

		// Digital Publishing ARIA module
		'doc-acknowledgements',
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
	//   depth: (int)            -- indicates nesting of landmarks
	//   role: (string)          -- the ARIA role
	//   label: (string or null) -- author-supplied label
	//   element: (HTML*Element) -- in-memory element


	//
	// Keeping track of landmark navigation
	//

	let currentlySelectedIndex

	// If we find a <main> or role="main" element...
	let mainElementIndex

	// Keep a reference to the currently-selected element in case the page
	// changes and the landmarks are updated.
	let currentlySelectedElement

	function updateSelectedIndexAndReturnElementInfo(index) {
		if (landmarks.length === 0) return
		currentlySelectedIndex = index
		currentlySelectedElement = landmarks[index].element
		return {
			element: currentlySelectedElement,
			role: landmarks[index].role,
			label: landmarks[index].label
		}
	}


	//
	// Functions that refer to document or window
	//

	// Recursive function for building list of landmarks from a root element
	function getLandmarks(element, depth, parentLandmark) {
		if (element === undefined) return

		element.childNodes.forEach(function(elementChild) {
			if (elementChild.nodeType === win.Node.ELEMENT_NODE) {
				if (isHidden(elementChild)) return

				// Support HTML5 elements' native roles
				let role = getRoleFromTagNameAndContainment(elementChild)

				// Elements with explicitly-set rolees
				if (elementChild.getAttribute) {
					const tempRole = elementChild.getAttribute('role')
					if (tempRole) {
						role = tempRole
					}
				}

				// The element may or may not have a label
				const label = getARIAProvidedLabel(elementChild)

				// Add the element if it should be considered a landmark
				if (role && isLandmark(role, label)) {
					if (parentLandmark && isDescendant(parentLandmark, elementChild)) {
						depth = depth + 1
					}

					landmarks.push({
						'depth': depth,
						'role': role,
						'label': label,
						'element': elementChild,
						'selector': createSelector(elementChild)
					})

					// Was this element selected before we were called (i.e.
					// before the page was dynamically updated)?
					if (currentlySelectedElement === elementChild) {
						currentlySelectedIndex = landmarks.length - 1
					}

					// If this is the first main landmark (there should only
					// be one), store a reference to it.
					if (mainElementIndex < 0 && role === 'main') {
						mainElementIndex = landmarks.length - 1
					}

					parentLandmark = elementChild
				}
			}

			// Recursively traverse the tree structure of the child node
			getLandmarks(elementChild, depth, parentLandmark)
		})
	}

	function getARIAProvidedLabel(element) {
		let label = null

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


	//
	// Functions that do not refer to document or window
	//

	function isLandmark(role, label) {
		// Region and form are landmarks only when they have labels
		if (role === 'region' || role === 'form') {
			return label !== null
		}

		// Is the role (which may have been explicitly set) a valid landmark type?
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

	function isDescendant(ancestor, child) {
		let node = child.parentNode

		while (node !== null) {
			if (node === ancestor) {
				return true
			}
			node = node.parentNode
		}

		return false
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

	function isHidden(element) {
		const style = win.getComputedStyle(element)
		if (element.hasAttribute('hidden')
			|| style.visibility === 'hidden'
			|| style.display === 'none' ) {
			return true
		}

		return false
	}

	function createSelector(element) {
		const reversePath = []
		let node = element

		while (node.tagName !== 'BODY') {
			const tag = node.tagName.toLowerCase()
			const id = node.id
			const klass = node.classList.length > 0 ? node.classList[0] : null

			const description = id
				? '#' + id
				: klass
					? tag + '.' + klass
					: tag

			reversePath.push(description)
			if (id) break
			node = node.parentNode
		}

		return reversePath.reverse().join(' ')
	}


	//
	// Public API
	//

	this.find = function() {
		landmarks = []
		mainElementIndex = -1
		currentlySelectedIndex = -1
		getLandmarks(doc.body.parentNode, 0)  // supports role on <body>
	}

	this.filter = function() {
		return landmarks.map(landmark => ({
			depth: landmark.depth,
			role: landmark.role,
			label: landmark.label,
			selector: landmark.selector  // TODO update docs if keeping this
		}))
	}

	this.getNumberOfLandmarks = function() {
		return landmarks.length
	}

	// FIXME update comment if need be
	// These all return elements and their public-facing info:
	// { element: <HTMLElement>, role: <string>, label: <string> }

	this.getNextLandmarkElementRoleLabel = function() {
		return updateSelectedIndexAndReturnElementInfo(
			(currentlySelectedIndex + 1) % landmarks.length)
	}

	this.getPreviousLandmarkElementRoleLabel = function() {
		return updateSelectedIndexAndReturnElementInfo(
			(currentlySelectedIndex <= 0) ?
				landmarks.length - 1 : currentlySelectedIndex - 1)
	}

	this.getLandmarkElementRoleLabel = function(index) {
		return updateSelectedIndexAndReturnElementInfo(index)
	}

	this.getMainElementRoleLabel = function() {
		return mainElementIndex < 0 ?
			null : updateSelectedIndexAndReturnElementInfo(mainElementIndex)
	}
}
