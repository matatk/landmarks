import './compatibility'
import sendToActiveTab from './sendToActiveTab'
import landmarkName from './landmarkName'


//
// Creating a landmarks tree in response to info from content script
//

// Handle incoming landmarks message response
//
// If there are landmarks, then the response will be a list of objects that
// represent the landmarks.
//
//     [ { label: X, role: Y, depth: Z }, { . . . }, . . . ]
//
// If we got some landmarks from the page, make the tree of them. If there was
// an error, let the user know.
function handleLandmarksResponse(response) {
	const display = document.getElementById('landmarks')
	removeChildNodes(display)

	if (response === undefined && browser.runtime.lastError) {
		addText(display, 'Landmarks cannot run on this page.')  // FIXME translate
		// doesn't appear that the problem is the page has not loaded yet (?)
		return
	}

	if (browser.runtime.lastError) {
		// Seems this is not going to happen
		addText(display,
			browser.i18n.getMessage('errorGettingLandmarksFromContentScript')
		)
		addReloadButton(display)
		return
	}

	if (Array.isArray(response)) {
		// Content script would normally send back an array of landmarks
		if (response.length === 0) {
			addText(display, browser.i18n.getMessage('noLandmarksFound'))
		} else {
			makeLandmarksTree(response, display)
		}
	} else {
		addText(display, errorString() + 'content script sent: ' + response)
	}
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
		const absDepthChange = Math.abs(depthChange)

		function whenDepthIncreases() {
			base = document.createElement('ul')
			previousItem.appendChild(base)
		}

		function whenDepthDecreases() {
			// The parent of base is an <li>, the grandparent is the <ul>
			base = base.parentElement.parentElement
		}

		// If the depth has changed, insert/step back the appropriate number of
		// levels

		if (absDepthChange > 0) {
			const operation =
				depthChange > 0 ? whenDepthIncreases : whenDepthDecreases
			for (let i = 0; i < absDepthChange; i++) {
				operation()
			}
		}

		// If nesting hasn't changed, stick with the current base

		// Create the <li> for this landmark
		const item = document.createElement('li')
		const button = document.createElement('button')
		button.className = 'browser-style'
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


//
// DOM manipulation utilities
//

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
	button.className = 'browser-style'
	button.appendChild(document.createTextNode(
		browser.i18n.getMessage('tryReloading')))
	button.addEventListener('click', reloadActivePage)
	element.appendChild(button)
}


//
// General utilities
//

// When a landmark's corresponding button in the UI is clicked, focus it
function focusLandmark(index) {
	sendToActiveTab({
		request: 'focus-landmark',
		index: index
	})
}

// Function to reload the page in the current tab
function reloadActivePage() {
	browser.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		browser.tabs.reload(tabs[0].tabId)
	})
	window.close()
}

// Return localised "Error: " string
function errorString() {
	return browser.i18n.getMessage('errorWord') + ': '
}


//
// Management
//

// Send a message to ask for the latest landmarks
function bootstrap() {
	document.getElementById('heading').innerText =
		browser.i18n.getMessage('popupHeading')  // FIXME only needs doing once?
	sendToActiveTab({ request: 'get-landmarks' }, handleLandmarksResponse)
}

// When the pop-up opens, grab and process the list of page landmarks
// TODO: Using this approach means that, in the case of the sidebar, there will
//       be an error encountered at first, as the sidebar loads before the
//       content script runs, and this will quickly be overwritten when the
//       update-sidebar or update-badge message is handled.
document.addEventListener('DOMContentLoaded', function() {
	bootstrap()
})

// We may be running in a sidebar, in which case listen for requests to update
browser.runtime.onMessage.addListener(function(message) {
	switch (message.request) {
		case 'update-sidebar':
		case 'update-badge':
			bootstrap()
			break
	}
})

// The sidebar may be open whilst the user interface setting is changed. This
// relies on the fact that the popup can't be open when the user is making
// these changes. We don't react to the value of this preference on load for
// the same reason -- that would require knowing if we are the sidebar or not.
browser.storage.onChanged.addListener(function(changes) {
	if (changes.hasOwnProperty('interface')) {
		if (changes.interface.newValue === 'sidebar') {
			bootstrap()
		} else {
			const display = document.getElementById('landmarks')
			removeChildNodes(display)
			addText(display, 'Landmarks will be displayed via the pop-up; please close this sidebar.')  // FIXME translate
		}
	}
})

// FIXME What if we're running in the sidebar, but the user has asked for the
//       popup to present the results?
