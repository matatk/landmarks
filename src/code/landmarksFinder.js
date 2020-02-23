/* eslint-disable no-prototype-builtins */
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
	//   depth: (int)                      -- indicates nesting of landmarks
	//   role: (string)                    -- the ARIA role
	//   roleDescription: (string | null)  -- custom role description
	//   label: (string | null)            -- associated label
	//   selector: (string)                -- CSS selector path of element
	//   element: (HTML*Element)           -- in-memory element


	//
	// Keeping track of landmark navigation
	//

	let currentlySelectedIndex  // the landmark currently having focus/border
	let mainElementIndex        // if we find a <main> or role="main" element

	// Keep a reference to the currently-selected element in case the page
	// changes and the landmark is still there, but has moved within the list.
	let currentlySelectedElement

	function updateSelectedIndexAndReturnElementInfo(index) {
		if (landmarks.length === 0) return
		currentlySelectedIndex = index
		currentlySelectedElement = landmarks[index].element
		return {
			element: currentlySelectedElement,
			role: landmarks[index].role,
			roleDescription: landmarks[index].roleDescription,
			label: landmarks[index].label
			// No need to send the selector this time
		}
	}


	//
	// Finding landmarks
	//

	// Recursive function for building list of landmarks from a root element
	function getLandmarks(element, depth, parentLandmark) {
		if (isVisuallyHidden(element)) return

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
				'selector': createSelector(element)
			})

			// Was this element selected before we were called (i.e.
			// before the page was dynamically updated)?
			if (currentlySelectedElement === element) {
				currentlySelectedIndex = landmarks.length - 1
			}

			// If this is the first main landmark (there should only
			// be one), store a reference to it.
			if (mainElementIndex < 0 && role === 'main') {
				mainElementIndex = landmarks.length - 1
			}

			parentLandmark = element
		}

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
	// Public API
	//

	this.find = function() {
		landmarks = []
		mainElementIndex = -1
		currentlySelectedIndex = -1
		getLandmarks(doc.body.parentNode, 0, null)  // supports role on <body>
	}

	this.getNumberOfLandmarks = function() {
		return landmarks.length
	}

	this.allInfos = function() {
		return landmarks.map(landmark => ({
			depth: landmark.depth,
			role: landmark.role,
			roleDescription: landmark.roleDescription,
			label: landmark.label,
			selector: landmark.selector
		}))
	}

	this.allElementsInfos = function() {
		return landmarks.map(landmark => ({
			element: landmark.element,
			depth: landmark.depth,
			role: landmark.role,
			roleDescription: landmark.roleDescription,
			label: landmark.label,
			selector: landmark.selector
		}))
	}

	// These all return elements and their related info

	this.getNextLandmarkElementInfo = function() {
		return updateSelectedIndexAndReturnElementInfo(
			(currentlySelectedIndex + 1) % landmarks.length)
	}

	this.getPreviousLandmarkElementInfo = function() {
		return updateSelectedIndexAndReturnElementInfo(
			(currentlySelectedIndex <= 0) ?
				landmarks.length - 1 : currentlySelectedIndex - 1)
	}

	this.getLandmarkElementInfo = function(index) {
		return updateSelectedIndexAndReturnElementInfo(index)
	}

	this.getMainElementInfo = function() {
		return mainElementIndex < 0 ?
			null : updateSelectedIndexAndReturnElementInfo(mainElementIndex)
	}
}
