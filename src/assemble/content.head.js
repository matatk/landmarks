/*
   Copyright © 2012 IBM Corp.
   Copyright © 2013-2016 The Paciello Group
   Copyright © 2016 Matthew Tylee Atkinson

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
   */
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
	'form',           // must have a label
	'main',
	'navigation',
	'region',         // must have a label
	'search'
])

// Mapping of HTML5 elements to implicit roles
const implicitRoles = Object.freeze({
	HEADER: 'banner',         // must not be in a <section> or <article>
	FOOTER: 'contentinfo',    // must not be in a <section> or <article>
	MAIN:   'main',
	ASIDE:  'complementary',
	NAV:    'navigation'
})


//
// Identifying Landmarks
//   -- uses DOM API only
//

// Recursive function for building list of landmarks from a given root element
function getLandmarks(currentElement, depth) {
	if (!currentElement) return

	doForEach(currentElement.childNodes, function(currentElementChild) {
		if (currentElementChild.nodeType === Node.ELEMENT_NODE) {
			// Support HTML5 elements' native roles
			let role = getRoleFromTagNameAndContainment(currentElementChild, currentElement)

			// Elements with explicitly-set rolees
			if (currentElementChild.getAttribute) {
				const tempRole = currentElementChild.getAttribute('role')
				if (tempRole) {
					role = tempRole
				}
			}

			// The element may or may not have a label
			const label = getARIAProvidedLabel(currentElementChild)

			// Add the element if it should be considered a landmark
			if (role && isLandmark(role, label)) {
				const lastLandmarkedElement = getLastLandmarkedElement()

				if (isDescendant(lastLandmarkedElement, currentElementChild)) {
					++depth
				}

				g_landmarkedElements.push({
					depth: depth,
					role: role,
					label: label,
					element: currentElementChild
				})
			}
		}

		// Recursively traverse the tree structure of the child node
		getLandmarks(currentElementChild, depth)
	})
}

function getRoleFromTagNameAndContainment(childElement, parentElement) {
	const name = childElement.tagName
	let role = null

	if (name) {
		try {
			role = implicitRoles[childElement.tagName]
		} catch(e) {
			// role = null;
		}

		// Perform containment checks
		// TODO: how far up should the containment check go (current is just one level -- what about interleaving <div>s)?
		if (name === 'HEADER' || name === 'FOOTER') {
			const parent_name = parentElement.tagName
			if (parent_name === 'SECTION' || parent_name === 'ARTICLE') {
				role = null
			}
		}
	}

	return role
}

function isDescendant(parent, child) {
	let node = child.parentNode

	while (node !== null) {
		if (node === parent) {
			return true
		}
		node = node.parentNode
	}

	return false
}

function isLandmark(role, label) {
	// Region, application and form are counted as landmarks only when
	// they have labels
	if (role === 'region' || role === 'application' || role === 'form') {
		return label !== null
	}

	return regionTypes.indexOf(role) > -1
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
//   -- uses DOM API only
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


