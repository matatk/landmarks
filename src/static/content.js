/*
   © Copyright IBM Corp. 2012
   © Copyright Matthew Tylee Atkinson, The Paciello Group 2013-2016

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

var selectedIndex = null;          // Currently selected landmark
var previousSelectedIndex = null;  // Previously selected landmark
var landmarkedElements = [];       // Array of landmarked elements
var alreadyGotLandmarks = false;

// Each member of landmarkedElements is an object of the form:
//   depth: (int)
//   [ARIA] role: (string)
//   [author-supplied] label: (string or null)
//   [the in-memory DOM] element: (HTML*Element)

// List of landmarks to navigate
var landmarks = [
	'application',    // must have a label -- TODO decide if should remove
	'banner',
	'complementary',
	'contentinfo',
	'form',           // must have a label
	'main',
	'navigation',
	'region',         // must have a label
	'search'
];

// mapping of HTML5 elements to implicit roles
var implicitRoles = {
	HEADER: 'banner',         // must not be in a <section> or <article>
	FOOTER: 'contentinfo',    // must not be in a <section> or <article>
	MAIN:   'main',
	ASIDE:  'complementary',
	NAV:    'navigation'
};


//
// Identifying Landmarks
//

// Recursive function for building list of landmarks on the page
function getLandmarks(currentElement, depth) {
	if (!currentElement) return;

	doForEach (currentElement.childNodes, function (currentElementChild) {
		if (currentElementChild.nodeType == 1) {
			// Support HTML5 elements' native roles
			var role = getRoleFromTagNameAndContainment(currentElementChild, currentElement);

			// Elements with explicitly-set rolees
			if (currentElementChild.getAttribute) {
				var tempRole = currentElementChild.getAttribute('role');
				if (tempRole) {
					role = tempRole;
				}
			}

			// The element may or may not have a label
			var label = getARIAProvidedLabel(currentElementChild);

			// Add the element if it should be considered a landmark
			if (role && isLandmark(role, label, currentElementChild)) {
				var lastLandmarkedElement = getLastLandmarkedElement();

				if (isDescendant(lastLandmarkedElement, currentElementChild)) {
					++depth;
				}

				landmarkedElements.push({
					depth: depth,
					role: role,
					label: label,
					element: currentElementChild
				});
			}
		}

		// Recursively traverse the tree structure of the child node
		getLandmarks(currentElementChild, depth);
	});
}

function getRoleFromTagNameAndContainment(childElement, parentElement) {
	var name = childElement.tagName;
	var role = null;

	if (name) {
		try {
			role = implicitRoles[childElement.tagName];
		} catch(e) {
			//role = null;
		}

		// Perform containment checks
		// TODO: how far up should the containment check go (current is just one level -- what about interleaving <div>s)?
		if (name == 'HEADER' || name == 'FOOTER') {
			var parent_name = parentElement.tagName;
			if (parent_name == 'SECTION' || parent_name == 'ARTICLE') {
				role = null;
			}
		}
	}

	return role;
}

function isDescendant(parent, child) {
	var node = child.parentNode;

	while (node !== null) {
		if (node == parent) {
			return true;
		}
		node = node.parentNode;
	}

	return false;
}

function isLandmark(role, label, element) {
	// Region, application and form are counted as landmarks only when
	// they have labels
	if (role == 'region' || role == 'application' || role == 'form') {
		return label !== null;
	}

	return landmarks.indexOf(role) > -1;
}

// Get the landmark label if specified
function getARIAProvidedLabel(element) {
	var label = element.getAttribute('aria-label');

	if (label === null) {
		var labelID = element.getAttribute('aria-labelledby');
		if (labelID !== null) {
			var labelElement = document.getElementById(labelID);
			label = getInnerText(labelElement);
		}
	}

	return label;
}

function getInnerText(element) {
	var text = null;

	if (element) {
		text = element.innerText;
		if (text === undefined)
			text = element.textContent;
	}

	return text;
}


//
// Utilities
//

// forEach for NodeList (as opposed to Arrays)
function doForEach(nodeList, callback) {
	for (var i = 0; i < nodeList.length; i++) {
		callback(nodeList[i]);
	}
}

// Abstracts the data storage format away from simply getting the last-
// landmarked DOM node
function getLastLandmarkedElement() {
	var lastInfo = landmarkedElements[landmarkedElements.length - 1];
	if (lastInfo) {
		return lastInfo.element;
	}
}


//
// Focusing
//

// Advance to next landmark via hot key
function nextLandmark() {
	if (landmarkedElements.length === 0) {
		msg_no_landmarks();
	} else {
		var landmarkCount = landmarkedElements.length;
		focusElement((previousSelectedIndex + 1) % landmarkCount);
	}
}

// Advance to previous landmark via hot key
function previousLandmark() {
	if (landmarkedElements.length === 0) {
		msg_no_landmarks();
	} else {
		var selectedLandmark = (previousSelectedIndex <= 0) ? landmarkedElements.length - 1 : previousSelectedIndex - 1;
		focusElement(selectedLandmark);
	}
}

// Set focus on the selected landmark
function focusElement(index) {
	var borderTypePref = 'persistent'; //prefs.getCharPref('borderType');

	// Remove border on previously selected DOM element
	if (previousSelectedIndex >= 0) {
		var previouslySelectedElement = landmarkedElements[previousSelectedIndex].element;
		if ((borderTypePref == 'persistent' || borderTypePref == 'momentary') && previouslySelectedElement) {  // TODO need last check?
			removeBorder(previouslySelectedElement);
		}
	}

	// Ensure that the element is focusable
	var element = landmarkedElements[index].element;
	var originalTabindex = element.getAttribute('tabindex');
	if (originalTabindex === null || originalTabindex == '0') {
		element.setAttribute('tabindex', '-1');
	}

	element.focus();

	// Add the border and set a timer to remove it (if required by user)
	if (borderTypePref == 'persistent' || borderTypePref == 'momentary') {
		addBorder(element);

		if (borderTypePref == 'momentary') {
			setTimeout(function() { removeBorder(element); }, 1000);
		}
	}

	// Restore tabindex value
	if (originalTabindex === null) {
		element.removeAttribute('tabindex');
	} else if (originalTabindex == '0') {
		element.setAttribute('tabindex', '0');
	}

	selectedIndex = index;
	previousSelectedIndex = selectedIndex;
}

function addBorder(element) {
	element.style.outline = 'medium solid red';
}

function removeBorder(element) {
	element.style.outline = '';
}

function msg_no_landmarks() {
	alert('No landmarks were found on this page.');
}


//
// Extension Bootstroapping and Messaging
//

// Initialise the globals and get the landmarked elements on the page
function refresh() {
	previousSelectedIndex = -1;
	selectedIndex = -1;
	landmarkedElements = [];
	getLandmarks(document.getElementsByTagName('body')[0], 0);
	alreadyGotLandmarks = true;
}

// Filter the full-featured landmarkedElements array into something that the
// browser-chrome-based part can use. Send all info except the DOM element.
function filterLandmarks() {
	var list = [];
	landmarkedElements.forEach(function (landmark) {
		list.push({
			depth: landmark.depth,
			role: landmark.role,
			label: landmark.label
		});
	});
	return list;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (message.request == 'get-landmarks') {
		// If the document loaded, try to get and send the landmarks...
		if (document.readyState === 'complete') {
			if (!alreadyGotLandmarks) {
				refresh();
			}

			if (landmarkedElements.length > 0) {
				sendResponse(filterLandmarks());
			} else {
				sendResponse([]);  // null/undefined could be ambiguous
			}
		}
		// Don't send a response if we don't know yet
	} else if (message.request == 'focus-landmark') {
		focusElement(message.index);
	}
});