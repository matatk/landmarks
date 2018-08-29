import './compatibility'
import landmarkName from './landmarkName'
import { defaultInterfaceSettings, dismissalStates } from './defaults'
import disconnectingPortErrorCheck from './disconnectingPortErrorCheck'
// FIXME remove message 'errorNoConnection'
// FIXME remove message 'errorGettingLandmarksFromContentScript'
// FIXME remove message about reloading the page

let port

//
// Creating a landmarks tree in response to info from content script
//

// FIXME update comments
// Handle incoming landmarks message response
//
// If there are landmarks, then the response will be a list of objects that
// represent the landmarks.
//
//     [ { label: X, role: Y, depth: Z }, { . . . }, . . . ]
//
// If we got some landmarks from the page, make the tree of them. If there was
// an error, let the user know.
function handleLandmarksMessage(data) {
	const display = document.getElementById('landmarks')
	removeChildNodes(display)

	// Content script would normally send back an array of landmarks
	if (Array.isArray(data)) {
		if (data.length === 0) {
			addText(display, browser.i18n.getMessage('noLandmarksFound'))
		} else {
			makeLandmarksTree(data, display)
		}
	} else {
		addText(display, errorString() + 'content script sent: ' + data)
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
		// FIXME factor out makeButton() and makeLocalisedButton() or similar
		// FIXME need better names as both are localised
		// TODO DRY use makeButton?
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

function makeButton(nameMessage, onClick) {
	const button = document.createElement('button')
	button.className = 'browser-style'
	button.appendChild(document.createTextNode(
		browser.i18n.getMessage(nameMessage)))
	button.onclick = onClick
	return button
}


//
// General utilities
//

// When a landmark's corresponding button in the UI is clicked, focus it
function focusLandmark(index) {
	port.postMessage({
		name: 'focus-landmark',
		index: index
	})
}

// Return localised "Error: " string
function errorString() {
	return browser.i18n.getMessage('errorWord') + ': '
}


//
// Management
//

// Send a message to ask for the latest landmarks
function requestLandmarks() {
	port.postMessage({ name: 'get-landmarks' })
}

if (INTERFACE === 'sidebar') {
	const noteId = 'note'

	function createNote() {  // eslint-disable-line no-inner-declarations
		browser.storage.sync.get(dismissalStates, function(items) {
			if (!items.dismissedSidebarNotAlone) {
				const para = document.createElement('p')
				para.appendChild(document.createTextNode(
					browser.i18n.getMessage('hintSidebarIsNotPrimary')))

				const optionsButton = makeButton(
					'hintSidebarIsNotPrimaryOptions',
					function() {
						browser.runtime.openOptionsPage()
					})

				const dismissButton = makeButton('hintDismiss',
					function() {
						browser.storage.sync.set({
							dismissedSidebarNotAlone: true
						}, function() {
							removeNote()
						})
					})

				// Contains buttons; allows for them to be flexbox'd
				const buttons = document.createElement('div')
				buttons.appendChild(optionsButton)
				buttons.appendChild(dismissButton)

				const note = document.createElement('div')
				note.id = noteId
				note.appendChild(para)
				note.appendChild(buttons)

				document.body.insertBefore(note, document.body.firstChild)
			}
		})
	}

	function removeNote() {  // eslint-disable-line no-inner-declarations
		const message = document.getElementById(noteId)
		if (message) message.remove()
	}

	browser.storage.sync.get(defaultInterfaceSettings, function(items) {
		if (items.interface === 'popup') {
			createNote()
		}
	})

	// The sidebar may be open whilst the user interface setting is changed. This
	// relies on the fact that the popup can't be open when the user is making
	// these changes. We don't react to the value of this preference on load for
	// the same reason -- that would require knowing if we are the sidebar or not.
	browser.storage.onChanged.addListener(function(changes) {
		if (changes.hasOwnProperty('interface')) {
			switch (changes.interface.newValue) {
				case 'sidebar': removeNote()
					break
				case 'popup': createNote()
					break
				default:
					throw Error(`Unknown interface type "${changes.interface.newValue}`)  // FIXME DRY-ish (at least the error message?)
			}
		}
	})
}

// When the pop-up (or sidebar) opens, translate the heading and grab and
// process the list of page landmarks
// FIXME https://github.com/matatk/landmarks/issues/192
document.addEventListener('DOMContentLoaded', function() {
	document.getElementById('heading').innerText =
		browser.i18n.getMessage('popupHeading')

	requestLandmarks()
})


//
// FIXME neaten up
//

if (INTERFACE === 'devtools') {
	port = browser.runtime.connect({ name: INTERFACE })
	port.postMessage({ name: 'init', tabId: browser.devtools.inspectedWindow.tabId })
} else {
	port = browser.runtime.connect({ name: INTERFACE })
}

port.onDisconnect.addListener(disconnectingPortErrorCheck)

port.onMessage.addListener(function(message) {
	switch (message.name) {
		case 'landmarks':
			handleLandmarksMessage(message.data)
			break
		default:
			throw Error(`Unkown message ${JSON.stringify(message)}`)
	}
})
