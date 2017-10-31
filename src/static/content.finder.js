'use strict'
/* exported LandmarksFinder */

function LandmarksFinder(win, doc) {
	//
	// Constants
	//

	// List of landmarks to navigate
	const regionTypes = Object.freeze([
		'banner',
		'complementary',
		'contentinfo',
		'form',           // should label
		'main',
		'navigation',
		'region',         // must label
		'search'
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
	// Found Landmarks
	//

	let landmarks = []
	// Each member of this array is an object of the form:
	//   depth: (int)            -- indicates nesting of landmarks
	//   role: (string)          -- the ARIA role
	//   label: (string or null) -- author-supplied label
	//   element: (HTML*Element) -- in-memory element

	let haveSearchedForLandmarks = false


	//
	// Keeping track of landmark navigation
	//

	let currentlySelectedIndex

	// Keep a reference to the currently-selected element in case the page
	// changes and the landmarks are updated.
	let selectedElement

	function updateSelectedIndexAndReturnElement(index) {
		if (landmarks.length === 0) return
		currentlySelectedIndex = index
		selectedElement = landmarks[index].element
		return selectedElement
	}


	//
	// Utilities
	//

	function getLastLandmarkedElement() {
		const lastInfo = landmarks[landmarks.length - 1]
		if (lastInfo) {
			return lastInfo.element
		}
	}


	//
	// Functions that refer to document or window
	//

	// Recursive function for building list of landmarks from a root element
	function getLandmarks(element, depth) {
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
					const lastLandmark = getLastLandmarkedElement()
					if (lastLandmark && isDescendant(lastLandmark, elementChild)) {
						depth = depth + 1
					}

					landmarks.push({
						'depth': depth,
						'role': role,
						'label': label,
						'element': elementChild
					})

					if (selectedElement === elementChild) {
						currentlySelectedIndex = landmarks.length - 1
					}
				}
			}

			// Recursively traverse the tree structure of the child node
			getLandmarks(elementChild, depth)
		})
	}

	function getARIAProvidedLabel(element) {
		let label = null

		const labelID = element.getAttribute('aria-labelledby')
		if (labelID !== null) {
			const labelElement = doc.getElementById(labelID)
			label = getInnerText(labelElement)
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


	//
	// Public API
	//

	this.find = function() {
		landmarks = []
		currentlySelectedIndex = -1
		getLandmarks(doc.body.parentNode, 0)  // supports role on <body>
		haveSearchedForLandmarks = true
	}

	this.haveSearchedForLandmarks = function() {
		return haveSearchedForLandmarks
	}

	this.reset = function() {
		haveSearchedForLandmarks = false
	}

	this.filter = function() {
		return landmarks.map(landmark => ({
			depth: landmark.depth,
			role: landmark.role,
			label: landmark.label
		}))
	}

	this.numberOfLandmarks = function() {
		return haveSearchedForLandmarks ? landmarks.length : -1
	}

	this.currentLandmarkElement = function() {
		if (landmarks.length === 0) return
		return landmarks[currentlySelectedIndex].element
	}

	this.nextLandmarkElement = function() {
		return updateSelectedIndexAndReturnElement(
			(currentlySelectedIndex + 1) % landmarks.length
		)
	}

	this.previousLandmarkElement = function() {
		return updateSelectedIndexAndReturnElement(
			(currentlySelectedIndex <= 0) ? landmarks.length - 1 : currentlySelectedIndex - 1
		)
	}

	this.landmarkElement = function(index) {
		return updateSelectedIndexAndReturnElement(index)
	}
}
