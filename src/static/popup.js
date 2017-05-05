'use strict'
/* global sendToActiveTab */

let hadAnError = false

// Handle incoming landmarks message response
//
// If there are landmarks, then the response will be a list of objects that
// represent the landmarks.
//
//     [ { label: X, role: Y, depth: Z }, { . . . }, . . . ]
//
// If we got some landmarks from the page, make the tree of them.
//
// If not, put a message there stating such.
function handleLandmarksResponse(response) {
	const display = document.getElementById('landmarks')
	removeChildNodes(display)

	// The first time we get an error, it could be because we're in Chrome and
	// the content script has not been injected because the extension was just
	// installed.  Try to inject the content script, but if that fails, then
	// we need to accept the error and report it to the user.

	if (chrome.runtime.lastError) {
		if (!hadAnError) {
			logError(1, chrome.runtime.lastError.message)
			chrome.tabs.executeScript(null, {
				file: 'content.landmarks-finder.js'
			}, function() {
				chrome.tabs.executeScript(null, {
					file: 'content.focusing.js'
				}, function() {
					chrome.tabs.executeScript(null, {
						file: 'content.management.js'
					}, function() {
						sendToActiveTab({request: 'get-landmarks-wait'},
							handleLandmarksResponse)
						addText(display,
							chrome.i18n.getMessage('waitingForLandmarks'))
					})
				})
			})
			hadAnError = true
		} else {
			logError(2, chrome.runtime.lastError.message)
			addText(display,
				chrome.i18n.getMessage('errorGettingLandmarksFromContentScript')
			)
			addReloadButton(display)
		}
		return
	}

	if (Array.isArray(response)) {
		// Content script would normally send back an array of landmarks
		if (response.length === 0) {
			addText(display, chrome.i18n.getMessage('noLandmarksFound'))
		} else {
			makeLandmarksTree(response, display)
		}
	} else if (response === 'wait') {
		addText(display, chrome.i18n.getMessage('pageNotLoadedYet'))
	} else {
		addText(display, errorString() + 'content script sent: ' + response)
	}
}

// Remove all nodes contained within a node
function removeChildNodes(element) {
	while (element.firstChild) {
		element.removeChild(element.firstChild)
	}
}

// Append text paragraph to the given element
function addText(element, message) {
	const newPara = document.createElement('p')
	const newParaText = document.createTextNode(message)
	newPara.appendChild(newParaText)
	element.appendChild(newPara)
}

// Create a button that reloads the current page and add it to an element
// (Needs to be done this way to avoid CSP violation)
function addReloadButton(element) {
	const button = document.createElement('button')
	button.appendChild(document.createTextNode(
		chrome.i18n.getMessage('tryReloading')))
	button.addEventListener('click', reloadActivePage)
	element.appendChild(button)
}

// Function to reload the page in the current tab
function reloadActivePage() {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.reload(tabs[0].tabId)
	})
	window.close()
}

// Return localised "Error: " string
function errorString() {
	return chrome.i18n.getMessage('errorWord') + ': '
}

// Log an error, at least partly localised
function logError(number, thing) {
	console.error(errorString() + number, thing)
}

// Go through the landmarks identified for the page and create an HTML
// nested list to mirror the structure of those landmarks
function makeLandmarksTree(landmarks, container) {
	let previousDepth = 0
	const root = document.createElement('ul')  // start of tree
	let base = root                            // anchor for sub-trees
	let previousItem = null                    // last item to be created

	landmarks.forEach(function(landmark, index) {
		const depthChange = landmark.depth - previousDepth

		// When nesting increases, attach a new <ul> to the last-created <li>
		if (depthChange > 0) {
			base = document.createElement('ul')
			previousItem.appendChild(base)
		}

		// When nesting decreases, attach new <li>s to the current base's parent
		if (depthChange < 0) {
			// the parent of base is an <li>, the grandparent is the <ul>
			base = base.parentElement.parentElement
		}

		// If nesting hasn't changed, stick with the current base

		// Create the <li> for this landmark
		const item = document.createElement('li')
		const button = document.createElement('button')
		button.appendChild(document.createTextNode(landmarkName(landmark)))
		button.addEventListener('click', function() {
			focusLandmark(index)
		})
		item.appendChild(button)
		base.appendChild(item)  // add to current base

		// Housekeeping
		previousDepth = landmark.depth
		previousItem = item
	})

	container.appendChild(root)
}

// If the landmark has a label, the name is: 'label (role)'
// otherwise the name is just 'role'
function landmarkName(landmark) {
	if (landmark.label) {
		return landmark.label + ' (' + landmark.role + ')'
	}

	return landmark.role
}

// When a landmark's corresponding button in the UI is clicked, focus it
function focusLandmark(index) {
	sendToActiveTab({
		request: 'focus-landmark',
		index: index
	})
}

// When the pop-up opens, grab and process the list of page landmarks
document.addEventListener('DOMContentLoaded', function() {
	document.getElementById('heading').innerText =
		chrome.i18n.getMessage('popupHeading')
	sendToActiveTab({request: 'get-landmarks'}, handleLandmarksResponse)
})
