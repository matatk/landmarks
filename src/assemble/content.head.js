'use strict'

// List of landmarks to navigate
const regionTypes = Object.freeze([
	'application',    // must have a label -- TODO decide if should remove
	'banner',
	'complementary',
	'contentinfo',
	'form',           // must have a label -- TODO add test
	'main',
	'navigation',
	'region',         // must have a label -- TODO add test
	'search'
])

// Mapping of HTML5 elements to implicit roles
const implicitRoles = Object.freeze({
	HEADER: 'banner',         // not in all cases; per note -- TODO add test
	FOOTER: 'contentinfo',    // not in all cases; per note
	MAIN:   'main',
	ASIDE:  'complementary',
	NAV:    'navigation'
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
// Utilities
//

// forEach for NodeList (as opposed to Arrays)
function doForEach(nodeList, callback) {
	for (let i = 0; i < nodeList.length; i++) {
		callback(nodeList[i])
	}
}


//
// Identifying Landmarks -- functions that do not refer to document or window
//

function isLandmark(role, label) {
	// Region, application and form are counted as landmarks only when
	// they have labels
	if (role === 'region' || role === 'application' || role === 'form') {
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


//
// Making a LandmarksFinder object
//

function LandmarksFinder(win, doc) {
	//
	// Identifying Landmarks
	//

	let landmarks = []
	// Each member of this array is an object of the form:
	//   depth: (int)            -- indicates nesting of landmarks
	//   role: (string)          -- the ARIA role
	//   label: (string or null) -- author-supplied label
	//   element: (HTML*Element) -- in-memory element

	// The following functions refer to document or window, hence are in here

	// Recursive function for building list of landmarks from a root element
	function getLandmarks(element, depth) {
		if (!element) return

		doForEach(element.childNodes, function(elementChild) {
			if (elementChild.nodeType === win.Node.ELEMENT_NODE) {
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
					const lastLandmarkedElement = getLastLandmarkedElement()

					if (isDescendant(lastLandmarkedElement, elementChild)) {
						++depth
					}

					landmarks.push({
						depth: depth,
						role: role,
						label: label,
						element: elementChild
					})
				}
			}

			// Recursively traverse the tree structure of the child node
			getLandmarks(elementChild, depth)
		})
	}

	function isDescendant(ancestor, child) {
		let node = child.parentNode

		while (node !== doc.body) {
			if (node === ancestor) {
				return true
			}
			node = node.parentNode
		}

		return false
	}

	// This function doesn't refer to win or doc, but calls one that does
	function getRoleFromTagNameAndContainment(element) {
		const name = element.tagName
		let role = null

		if (name) {
			if (implicitRoles.hasOwnProperty(name)) {
				role = implicitRoles[name]
			}

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

		while (ancestor !== doc.body) {
			if (nonBodySectioningElementsAndMain.includes(ancestor.tagName)) {
				return false
			}
			ancestor = ancestor.parentNode
		}

		return true
	}

	function getARIAProvidedLabel(element) {
		let label = element.getAttribute('aria-label')

		if (label === null) {
			const labelID = element.getAttribute('aria-labelledby')
			if (labelID !== null) {
				const labelElement = doc.getElementById(labelID)
				label = getInnerText(labelElement)
			}
		}

		return label
	}

	function getLastLandmarkedElement() {
		// TODO not the right check?
		const lastInfo = landmarks[landmarks.length - 1]
		if (lastInfo) {
			return lastInfo.element
		}
	}


	//
	// Keeping track of landmark navigation
	//

	let currentlySelectedIndex


	//
	// Public API
	//

	this.find = function() {
		landmarks = []
		getLandmarks(doc.body, 0)
		currentlySelectedIndex = -1
		return landmarks
	}

	// TODO could possibly call this before .find() is called
	this.filter = function() {
		const list = []
		landmarks.forEach(function(landmark) {
			list.push({
				depth: landmark.depth,
				role: landmark.role,
				label: landmark.label
			})
		})
		return list
	}

	// TODO could possibly call this before .find() is called
	this.numberOfLandmarks = function() {
		return landmarks.length
	}

	this.currentLandmarkElement = function() {
		if (landmarks.length === 0) return
		return landmarks[currentlySelectedIndex].element
	}

	function updateSelectedIndexAndReturnElement(index) {
		currentlySelectedIndex = index
		console.log('now currently selected', index, landmarks[index])
		return landmarks[index].element
	}

	this.nextLandmarkElement = function() {
		if (landmarks.length === 0) return
		const newSelectedIndex = (currentlySelectedIndex + 1) % landmarks.length
		return updateSelectedIndexAndReturnElement(newSelectedIndex)
	}

	this.previousLandmarkElement = function() {
		if (landmarks.length === 0) return
		const newSelectedIndex = (currentlySelectedIndex <= 0) ? landmarks.length - 1 : currentlySelectedIndex - 1
		return updateSelectedIndexAndReturnElement(newSelectedIndex)
	}

	// TODO check for index error
	this.landmarkElement = function(index) {
		return updateSelectedIndexAndReturnElement(index)
	}
}
