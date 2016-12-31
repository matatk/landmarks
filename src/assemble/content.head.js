'use strict'

let g_gotLandmarks = false        // Have we already found landmarks?
let g_selectedIndex = -1          // Currently selected landmark
let g_previousSelectedIndex = -1  // Previously selected landmark
const g_landmarkedElements = []   // Array of landmarked elements

// Each member of g_landmarkedElements is an object of the form:
//   depth: (int)
//   [ARIA] role: (string)
//   [author-supplied] label: (string or null)
//   [the in-memory DOM] element: (HTML*Element)

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
// Identifying Landmarks
//

// Recursive function for building list of landmarks from a given root element
function getLandmarks(element, depth) {
	if (!element) return

	doForEach(element.childNodes, function(elementChild) {
		if (elementChild.nodeType === Node.ELEMENT_NODE) {
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

				g_landmarkedElements.push({
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

function isDescendant(parent, child) {
	let node = child.parentNode

	while (node !== document.body) {
		if (node === parent) {
			return true
		}
		node = node.parentNode
	}

	return false
}

function isChildOfTopLevelSection(element) {
	let ancestor = element.parentNode

	while (ancestor !== document.body) {
		if (nonBodySectioningElementsAndMain.includes(ancestor.tagName)) {
			return false
		}
		ancestor = ancestor.parentNode
	}

	return true
}

function isLandmark(role, label) {
	// Region, application and form are counted as landmarks only when
	// they have labels
	if (role === 'region' || role === 'application' || role === 'form') {
		return label !== null
	}

	// Is the role (which may have been explicitly set) a valid landmark type?
	return regionTypes.includes(role)
}

function getARIAProvidedLabel(element) {
	let label = element.getAttribute('aria-label')

	if (label === null) {
		const labelID = element.getAttribute('aria-labelledby')
		if (labelID !== null) {
			const labelElement = document.getElementById(labelID)
			label = getInnerText(labelElement)
		}
	}

	return label
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

// Initialise the globals and get the landmarked elements on the page
function findLandmarks() {
	g_previousSelectedIndex = -1
	g_selectedIndex = -1
	g_landmarkedElements.length = 0
	getLandmarks(document.getElementsByTagName('body')[0], 0)
	g_gotLandmarks = true
	console.log('Landmarks: found ' + g_landmarkedElements.length)
}

// Filter the full-featured g_landmarkedElements array into something that the
// browser-chrome-based part can use; send all info except the DOM element.
function filterLandmarks() {
	const list = []
	g_landmarkedElements.forEach(function(landmark) {
		list.push({
			depth: landmark.depth,
			role: landmark.role,
			label: landmark.label
		})
	})
	return list
}


//
// Utilities
//

// forEach for NodeList (as opposed to Arrays)
function doForEach(nodeList, callback) {
	for (let i = 0; i < nodeList.length; i++) {
		callback(nodeList[i])
	}
}

// Abstracts the data storage format away from simply getting the last-
// landmarked DOM node (HTML*Element object)
function getLastLandmarkedElement() {
	const lastInfo = g_landmarkedElements[g_landmarkedElements.length - 1]
	if (lastInfo) {
		return lastInfo.element
	}
}


