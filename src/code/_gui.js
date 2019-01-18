import './compatibility'
import landmarkName from './landmarkName'
import { defaultInterfaceSettings, dismissalStates } from './defaults'
import disconnectingPortErrorCheck from './disconnectingPortErrorCheck'

let port = null

//
// Creating a landmarks tree in response to info from content script
//

// Handle incoming landmarks message response
//
// If there are landmarks, then the response will be a list of objects that
// represent the landmarks.
//
//     [ { label: X, role: Y, depth: Z, selector: @ }, { . . . }, . . . ]
//
// If we got some landmarks from the page, make the tree of them. If there was
// an error, let the user know.
function handleLandmarksMessage(data) {
	const display = document.getElementById('landmarks')
	const showAllContainer = document.getElementById('show-all-label')
	removeChildNodes(display)

	// Content script would normally send back an array of landmarks
	if (Array.isArray(data)) {
		if (data.length === 0) {
			addText(display, browser.i18n.getMessage('noLandmarksFound'))
			showAllContainer.style.display = 'none'
		} else {
			makeLandmarksTree(data, display)
			showAllContainer.style.display = null
		}
	} else {
		addText(display, browser.i18n.getMessage('errorNoConnection'))
		showAllContainer.style.display = 'none'
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
		const button = makeButtonAlreadyTranslated(
			function() {
				focusLandmark(index)
			},
			landmarkName(landmark))
		item.appendChild(button)

		if (INTERFACE === 'devtools') {
			const inspectButton = makeSymbolButton(
				function() {
					const inspectorCall = "inspect(document.querySelector('"
						+ landmark.selector  // comes from our own code
						+ "'))"
					browser.devtools.inspectedWindow.eval(inspectorCall)
				},
				'inspectButtonName',
				'🔍',
				landmarkName(landmark))
			inspectButton.title = landmark.selector
			item.appendChild(inspectButton)
		}
		// Note: Edge doesn't support DevTools, so doesn't use the message
		//       'inspectButtonName' - but the build process needs this to be
		//       here for it to pass (hacky, as below, but Edge will change...)

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

function makeButton(onClick, nameMessage) {
	return makeButtonAlreadyTranslated(
		onClick,
		browser.i18n.getMessage(nameMessage))
}

function makeSymbolButton(onClick, nameMessage, symbol, context) {
	return makeButtonAlreadyTranslated(
		onClick,
		browser.i18n.getMessage(nameMessage),
		symbol,
		context)
}

function makeButtonAlreadyTranslated(onClick, name, symbol, context) {
	const button = document.createElement('button')
	button.className = 'browser-style'
	button.appendChild(document.createTextNode(symbol ? symbol : name))
	if (symbol) {
		button.setAttribute('aria-label', name + ' ' + context)
		button.style.border = 'none'
		button.style.background = 'none'
	}
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


//
// Toggling all landmarks
//

function handleToggleStateMessage(state) {
	const box = document.getElementById('show-all')
	switch(state) {
		case 'selected':
			box.checked = false
			break
		case 'all':
			box.checked = true
			break
		default:
			throw Error(`Unknown state ${state} given.`)
	}
}

function flipToggle() {
	port.postMessage({ name: 'toggle-all-landmarks' })
}


if (INTERFACE === 'sidebar') {
	//
	// Sidebar - Live updates and Preferences note
	//

	// The sidebar can be open even if the user has chosen the pop-up as the
	// primary GUI for Landmarks. In this case, a note can be created in the
	// sidebar to explain this to the user.
	const noteId = 'note'

	function createNote() {  // eslint-disable-line no-inner-declarations
		browser.storage.sync.get(dismissalStates, function(items) {
			if (items.dismissedSidebarNotAlone === false) {
				const para = document.createElement('p')
				para.appendChild(document.createTextNode(
					browser.i18n.getMessage('hintSidebarIsNotPrimary')))

				const optionsButton = makeButton(
					function() {
						browser.runtime.openOptionsPage()
					},
					'hintSidebarIsNotPrimaryOptions')

				const dismissButton = makeButton(
					function() {
						browser.storage.sync.set({
							dismissedSidebarNotAlone: true
						}, function() {
							removeNote()
						})
					},
					'hintDismiss')

				// Contains buttons; allows for them to be flexbox'd
				const buttons = document.createElement('div')
				buttons.appendChild(optionsButton)
				buttons.appendChild(dismissButton)

				const note = document.createElement('div')
				note.id = noteId
				note.appendChild(para)
				note.appendChild(buttons)

				const container = document.getElementById('container')
				container.insertBefore(note, container.firstChild)
			}
		})
	}

	function removeNote() {  // eslint-disable-line no-inner-declarations
		const message = document.getElementById(noteId)
		if (message) message.remove()
	}

	// Should we create the note in the sidebar when it opens?
	browser.storage.sync.get(defaultInterfaceSettings, function(items) {
		if (items.interface === 'popup') {
			createNote()
		}
	})

	browser.storage.onChanged.addListener(function(changes) {
		// What if the sidebar is open and the user changes their preference?
		if (changes.hasOwnProperty('interface')
			&& changes.interface.newValue !== changes.interface.oldValue) {
			switch (changes.interface.newValue) {
				case 'sidebar': removeNote()
					break
				case 'popup': createNote()
					break
				default:
					throw Error(`Unknown interface type "${changes.interface.newValue}`)
			}
		}

		// What if the user un-dismisses the message?
		if (changes.hasOwnProperty('dismissedSidebarNotAlone')) {
			browser.storage.sync.get('interface', function(items) {
				if (items.interface === 'popup') {
					if (changes.dismissedSidebarNotAlone.newValue === false) {
						createNote()
					}
				}
			})
		}
	})
}


//
// Management
//

// When the pop-up (or sidebar) opens, translate the heading and grab and
// process the list of page landmarks
function main() {
	document.getElementById('heading').innerText =
		browser.i18n.getMessage('popupHeading')

	document.getElementById('show-all-label').appendChild(document
		.createTextNode(browser.i18n.getMessage('popupShowAllLandmarks')))

	if (INTERFACE === 'devtools') {
		port = browser.runtime.connect({ name: INTERFACE })
		port.postMessage({
			name: 'init',
			tabId: browser.devtools.inspectedWindow.tabId
		})
	} else {
		port = browser.runtime.connect({ name: INTERFACE })
	}

	port.onDisconnect.addListener(function() {
		disconnectingPortErrorCheck()
		// Note: Firefox doesn't use 'devToolsConnectionError' but if it is not
		//       mentioned here, the build will not pass the unused messages
		//       check. This is a bit hacky, as Firefox really isn't using it,
		//       but at least it keeps all the code here, rather than putting
		//       some separately in the build script.
		if (INTERFACE === 'devtools'
			&& (BROWSER === 'chrome' || BROWSER === 'opera')) {
			// DevTools page doesn't get reloaded when the extension does
			const para = document.createElement('p')
			const warning = document.createTextNode(
				browser.i18n.getMessage('devToolsConnectionError'))
			para.appendChild(warning)
			document.body.insertBefore(para,
				document.querySelector('h1').nextSibling)
			document.body.style.backgroundColor = '#fee'
			// TODO make this use the note styles; will need some refactoring
		}
	})

	port.onMessage.addListener(function(message) {
		switch (message.name) {
			case 'landmarks':
				handleLandmarksMessage(message.data)
				break
			case 'toggle-state':
				handleToggleStateMessage(message.data)
				break
			default:
				throw Error(`Unkown message ${JSON.stringify(message)}`)
		}
	})

	port.postMessage({ name: 'get-landmarks' })
	port.postMessage({ name: 'get-toggle-state' })

	document.getElementById('show-all').addEventListener('change', flipToggle)

	document.getElementById('help').onclick = function() {
		port.postMessage({ name: 'open-help' })
		if (INTERFACE === 'popup') {
			window.close()
		}
	}

	document.getElementById('settings').onclick = function() {
		port.postMessage({ name: 'open-settings' })
		if (INTERFACE === 'popup') {
			window.close()
		}
	}
}

main()
