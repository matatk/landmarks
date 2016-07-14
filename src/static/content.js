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

let g_gotLandmarks = false;        // Have we already found landmarks?
let g_selectedIndex = -1;          // Currently selected landmark
let g_previousSelectedIndex = -1;  // Previously selected landmark
const g_landmarkedElements = [];   // Array of landmarked elements

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
]);

// Mapping of HTML5 elements to implicit roles
const implicitRoles = Object.freeze({
	HEADER: 'banner',         // must not be in a <section> or <article>
	FOOTER: 'contentinfo',    // must not be in a <section> or <article>
	MAIN:   'main',
	ASIDE:  'complementary',
	NAV:    'navigation'
});


//
// Identifying Landmarks
//

// Recursive function for building list of landmarks on the page
function getLandmarks(currentElement, depth) {
	if (!currentElement) return;

	doForEach(currentElement.childNodes, function(currentElementChild) {
		if (currentElementChild.nodeType === 1) {
			// Support HTML5 elements' native roles
			let role = getRoleFromTagNameAndContainment(currentElementChild, currentElement);

			// Elements with explicitly-set rolees
			if (currentElementChild.getAttribute) {
				const tempRole = currentElementChild.getAttribute('role');
				if (tempRole) {
					role = tempRole;
				}
			}

			// The element may or may not have a label
			const label = getARIAProvidedLabel(currentElementChild);

			// Add the element if it should be considered a landmark
			if (role && isLandmark(role, label, currentElementChild)) {
				const lastLandmarkedElement = getLastLandmarkedElement();

				if (isDescendant(lastLandmarkedElement, currentElementChild)) {
					++depth;
				}

				g_landmarkedElements.push({
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
	const name = childElement.tagName;
	let role = null;

	if (name) {
		try {
			role = implicitRoles[childElement.tagName];
		} catch(e) {
			//role = null;
		}

		// Perform containment checks
		// TODO: how far up should the containment check go (current is just one level -- what about interleaving <div>s)?
		if (name === 'HEADER' || name === 'FOOTER') {
			const parent_name = parentElement.tagName;
			if (parent_name === 'SECTION' || parent_name === 'ARTICLE') {
				role = null;
			}
		}
	}

	return role;
}

function isDescendant(parent, child) {
	let node = child.parentNode;

	while (node !== null) {
		if (node === parent) {
			return true;
		}
		node = node.parentNode;
	}

	return false;
}

function isLandmark(role, label, element) {
	// Region, application and form are counted as landmarks only when
	// they have labels
	if (role === 'region' || role === 'application' || role === 'form') {
		return label !== null;
	}

	return regionTypes.indexOf(role) > -1;
}

// Get the landmark label if specified
function getARIAProvidedLabel(element) {
	let label = element.getAttribute('aria-label');

	if (label === null) {
		const labelID = element.getAttribute('aria-labelledby');
		if (labelID !== null) {
			const labelElement = document.getElementById(labelID);
			label = getInnerText(labelElement);
		}
	}

	return label;
}

function getInnerText(element) {
	let text = null;

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
	for (let i = 0; i < nodeList.length; i++) {
		callback(nodeList[i]);
	}
}

// Abstracts the data storage format away from simply getting the last-
// landmarked DOM node (HTML*Element object)
function getLastLandmarkedElement() {
	const lastInfo = g_landmarkedElements[g_landmarkedElements.length - 1];
	if (lastInfo) {
		return lastInfo.element;
	}
}


//
// Focusing
//

function adjacentLandmark(delta) {
	// The user may use the keyboard commands before landmarks have been found
	// However, the content script will run and find any landmarks very soon
	// after the page has loaded.
	if (!g_gotLandmarks) {
		alert(chrome.i18n.getMessage('pageNotLoadedYet') + '.');
		return;
	}

	if (g_landmarkedElements.length === 0) {
		alert(chrome.i18n.getMessage('noLandmarksFound') + '.');
	} else {
		let newSelectedIndex = -1;
		if (delta > 0) {
			newSelectedIndex = (g_previousSelectedIndex + 1) % g_landmarkedElements.length;
		} else if (delta < 0) {
			newSelectedIndex = (g_previousSelectedIndex <= 0) ? g_landmarkedElements.length - 1 : g_previousSelectedIndex - 1;
		} else {
			throw("Landmarks: adjacentLandmark: delta should be negative or positive");
		}
		focusElement(newSelectedIndex);
	}
}

// Set focus on the selected landmark
//
// This is only triggered from the pop-up (after landmarks have been found) or
// from adjacentLandmark (also after landmarks have been found).
function focusElement(index) {
	getWrapper({
		'border_type': 'momentary'
	}, function(items) {
		const borderTypePref = items.border_type;

		removeBorderOnPreviouslySelectedElement();

		// Ensure that the element is focusable
		const element = g_landmarkedElements[index].element;
		const originalTabindex = element.getAttribute('tabindex');
		if (originalTabindex === null || originalTabindex === '0') {
			element.setAttribute('tabindex', '-1');
		}

		element.focus();

		// Add the border and set a timer to remove it (if required by user)
		if (borderTypePref === 'persistent' || borderTypePref === 'momentary') {
			addBorder(element);

			if (borderTypePref === 'momentary') {
				setTimeout(function() { removeBorder(element); }, 1000);
			}
		}

		// Restore tabindex value
		if (originalTabindex === null) {
			element.removeAttribute('tabindex');
		} else if (originalTabindex === '0') {
			element.setAttribute('tabindex', '0');
		}

		g_selectedIndex = index;
		g_previousSelectedIndex = g_selectedIndex;
	});
}

function removeBorderOnPreviouslySelectedElement() {
	if (g_previousSelectedIndex >= 0) {
		// TODO sometimes there's an undefined error here (due to no landmarks?)
		const previouslySelectedElement = g_landmarkedElements[g_previousSelectedIndex].element;
		// TODO re-insert check for border preference?
		// TODO do we need to check that the DOM element exists, as we did?
		removeBorder(previouslySelectedElement);
	}
}

function addBorder(element) {
	element.style.outline = 'medium solid red';
}

function removeBorder(element) {
	element.style.outline = '';
}


//
// Extension Bootstroapping and Messaging
//

// TODO: DRY also in options script
function getWrapper(options, action) {
	const area = chrome.storage.sync || chrome.storage.local;
	area.get(options, action);
}

// Initialise the globals and get the landmarked elements on the page
function findLandmarks() {
	g_previousSelectedIndex = -1;
	g_selectedIndex = -1;
	g_landmarkedElements.length = 0;
	getLandmarks(document.getElementsByTagName('body')[0], 0);
	g_gotLandmarks = true;
	console.log('Landmarks: found ' + g_landmarkedElements.length);
}

// Filter the full-featured g_landmarkedElements array into something that the
// browser-chrome-based part can use; send all info except the DOM element.
function filterLandmarks() {
	const list = [];
	g_landmarkedElements.forEach(function(landmark) {
		list.push({
			depth: landmark.depth,
			role: landmark.role,
			label: landmark.label
		});
	});
	return list;
}

// Act on requests from the background or pop-up scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	switch (message.request) {
		case 'get-landmarks':
			// The pop-up is requesting the list of landmarks on the page

			if (!g_gotLandmarks) {
				sendResponse('wait');
			}
			// We only guard for landmarks having been found here because the
			// other messages still need to be handled regardless (or, in some
			// cases, won't be recieved until after the pop-up has been
			// displayed, so this check only needs to be here).

			sendResponse(filterLandmarks());
			break;
		case 'focus-landmark':
			// Triggered by clicking on an item in the pop-up, or indirectly
			// via one of the keyboard shortcuts (if landmarks are present)
			focusElement(message.index);
			break;
		case 'next-landmark':
			// Triggered by keyboard shortcut
			adjacentLandmark(+1);
			break;
		case 'prev-landmark':
			// Triggered by keyboard shortcut
			adjacentLandmark(-1);
			break;
		case 'trigger-refresh':
			// On sites that use single-page style techniques to transition
			// (such as YouTube and GitHub) we monitor in the background script
			// for when the History API is used to update the URL of the page
			// (indicating that its content has changed substantially). When
			// this happens, we should treat it as a new page, and fetch
			// landmarks again when asked.
			removeBorderOnPreviouslySelectedElement();  // TODO rapid nav error
			g_gotLandmarks = false;
			findLandmarks();
			sendUpdateBadgeMessage();
			break;
		default:
			throw('Landmarks: content script received unknown message:',
				message, 'from', sender);
	}
});

function sendUpdateBadgeMessage() {
	// Let the background script know how many landmarks were found, so
	// that it can update the browser action badge.
	chrome.runtime.sendMessage({
		request: 'update-badge',
		landmarks: g_landmarkedElements.length
	});
}


//
// Content Script Entry Point
//

const attemptInterval = 1000;
const maximumAttempts = 10;
let landmarkFindingAttempts = 0;

function bootstrap() {
	landmarkFindingAttempts += 1;
	if (document.readyState === 'complete') {
		findLandmarks();
		sendUpdateBadgeMessage();
	} else {
		if (landmarkFindingAttempts <= maximumAttempts) {
			console.log('Landmarks: document not ready; retrying. (Attempt ' +
				String(landmarkFindingAttempts) + ')');
			setTimeout(bootstrap, attemptInterval);
		} else {
			throw('Landmarks: unable to find landmarks after ' +
				String(maximumAttempts) + 'attempts.');
		}
	}
}

setTimeout(bootstrap, attemptInterval);
