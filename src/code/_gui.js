// hasOwnProperty is only used on browser-provided objects
/* eslint-disable no-prototype-builtins */
import './compatibility'
import translate from './translate'
import landmarkName from './landmarkName'
import { defaultInterfaceSettings, dismissalStates } from './defaults'
import { isContentScriptablePage } from './isContent'
import LandmarksCounter from './landmarksCounter'

const frameContainerIdPrefix = 'for-frame-'

const rootLandmarks = document.getElementById('root-landmarks')
const otherLandmarks = document.getElementById('other-landmarks')
const status = document.getElementById('status')

const landmarksCounter = new LandmarksCounter()
let port = null


//
// Creating a landmarks tree in response to info from content script
//

// Handle incoming landmarks message response
//
// If we got some landmarks from the page, make the tree of them. If Landmarks
// can't run on that page, then the background script sends a null message, in
// which case, let the user know.
// FIXME: the null message may also mean simply 'reset for new page'
function handleLandmarksMessage(data, frame) {
	console.debug('handleLandmarksMessage():',
		data === null ? data : data.length, frame)

	const isTopLevelFrame = frame === 0
	const isDevTools = frame === null
	const isTopLevelFrameOrDevTools = isTopLevelFrame || isDevTools

	if (Array.isArray(data)) {
		if (data.length === 0) {
			if (isTopLevelFrameOrDevTools) {
				status.innerText = browser.i18n.getMessage('noLandmarksFound')
			}
		} else {
			const display = isTopLevelFrameOrDevTools
				? rootLandmarks
				: getResultsContainer(frame)

			// TODO: Why does the frame-specific display need cleaning?
			//       When the page reloads/is navigated, the null message from
			//       the background script oughta clear it...
			removeChildNodes(display)

			if (isTopLevelFrameOrDevTools) {
				status.innerText = null
			} else {
				const heading = document.createElement('p')
				heading.innerText = frame
				display.appendChild(heading)
			}

			makeLandmarksTree(data, display)
		}
		landmarksCounter.updateLandmarkCountForFrame(frame, data.length)
	} else {
		// FIXME separate out null cases (error or reset)
		status.innerText = browser.i18n.getMessage('forbiddenPage')
		landmarksCounter.reset()
		removeChildNodes(rootLandmarks)
		removeChildNodes(otherLandmarks)
	}

	const showAll = document.getElementById('show-all-label')
	if (landmarksCounter.totalNumberOfLandmarks > 0) {
		showAll.style.display = 'none'
	} else {
		delete showAll.style.display
	}
}

// Landmarks can be reported for different frames (or the top-level page)
function getResultsContainer(frame) {
	const id = frameContainerIdPrefix + String(frame)
	if (!document.getElementById(id)) {
		console.debug(`making ${id}`)
		const frameContainer = document.createElement('div')
		frameContainer.id = id
		otherLandmarks.appendChild(frameContainer)
	}
	console.debug(`returning ${id}`)
	return document.getElementById(id)
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
				send({ name: 'focus-landmark', index: index })
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

		base.appendChild(item)  // add to current base

		// Housekeeping
		previousDepth = landmark.depth
		previousItem = item
	})

	container.appendChild(root)
}

// Remove all nodes contained within a node
function removeChildNodes(element) {
	while (element.firstChild) {
		element.removeChild(element.firstChild)
	}
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
	button.appendChild(document.createTextNode(symbol ? symbol : name))
	if (symbol) {
		button.setAttribute('aria-label', name + ' ' + context)
		button.style.border = 'none'
		button.style.background = 'none'
	}
	button.onclick = onClick
	return button
}


if (INTERFACE === 'sidebar') {
	//
	// Sidebar - Live updates and Preferences note
	//

	// The sidebar can be open even if the user has chosen the pop-up as the
	// primary GUI for Landmarks. In this case, a note can be created in the
	// sidebar to explain this to the user.

	function showNote() {  // eslint-disable-line no-inner-declarations
		browser.storage.sync.get(dismissalStates, function(items) {
			if (items.dismissedSidebarNotAlone === false) {
				document.getElementById('note').hidden = false
			}
		})
	}

	function hideNote() {  // eslint-disable-line no-inner-declarations
		document.getElementById('note').hidden = true
	}

	document.getElementById('note-prefs').onclick = function() {
		browser.runtime.openOptionsPage()
	}

	document.getElementById('note-dismiss').onclick = function() {
		browser.storage.sync.set({
			dismissedSidebarNotAlone: true
		}, function() {
			hideNote()
		})
	}

	// Should we create the note in the sidebar when it opens?
	browser.storage.sync.get(defaultInterfaceSettings, function(items) {
		if (items.interface === 'popup') {
			showNote()
		}
	})

	browser.storage.onChanged.addListener(function(changes) {
		// What if the sidebar is open and the user changes their preference?
		if (changes.hasOwnProperty('interface')
			&& changes.interface.newValue !== changes.interface.oldValue) {
			switch (changes.interface.newValue) {
				case 'sidebar': hideNote()
					break
				case 'popup': showNote()
					break
				default:
					throw Error(`Unexpected interface type "${changes.interface.newValue}`)
			}
		}

		// What if the user un-dismisses the message?
		if (changes.hasOwnProperty('dismissedSidebarNotAlone')) {
			browser.storage.sync.get('interface', function(items) {
				if (items.interface === 'popup') {
					if (changes.dismissedSidebarNotAlone.newValue === false) {
						showNote()
					}
				}
			})
		}
	})
}


//
// Management
//

function makeEventHandlers(linkName) {
	const link = document.getElementById(linkName)
	const core = () => {
		browser.runtime.sendMessage({ name: `open-${linkName}` })
		if (INTERFACE === 'popup') window.close()
	}

	link.addEventListener('click', core)
	link.addEventListener('keydown', function(event) {
		if (event.key === 'Enter') core()
	})
}

// TODO this leaves an anonymous code block in the devtools script
function send(message) {
	if (INTERFACE === 'devtools') {
		const messageWithTabId = Object.assign({}, message, {
			from: browser.devtools.inspectedWindow.tabId
		})
		port.postMessage(messageWithTabId)
	} else {
		browser.tabs.query({ active: true, currentWindow: true }, tabs => {
			browser.tabs.sendMessage(tabs[0].id, message)
		})
	}
}

function messageHandlerCore(message, sender) {
	if (message.name === 'landmarks') {
		handleLandmarksMessage(
			message.data,
			sender.hasOwnProperty('frameId') ? sender.frameId : null)
	} else if (message.name === 'toggle-state-is') {
		handleToggleStateMessage(message.data)
	} else if (INTERFACE === 'devtools' && message.name === 'mutation-info') {
		handleMutationMessage(message.data)
	}
}

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
			throw Error(`Unexpected toggle state ${state} given.`)
	}
}

function handleMutationMessage(data) {
	for (const key in data) {
		document.getElementById(key).textContent = data[key]
	}
}

// When the pop-up (or sidebar) opens, translate the heading and grab and
// process the list of page landmarks
//
// Note: Firefox doesn't use 'devToolsConnectionError' but if it is not
//       mentioned here, the build will not pass the unused messages check.
//       This is a bit hacky, as these browsers really aren't using it, so
//       shouldn't really have it, but at least it keeps all the code here,
//       rather than putting some separately in the build script.
function main() {
	if (INTERFACE === 'devtools') {
		document.getElementById('links').remove()

		port = browser.runtime.connect({ name: INTERFACE })
		if (BROWSER !== 'firefox') {
			// DevTools page doesn't get reloaded when the extension does
			port.onDisconnect.addListener(function() {
				document.getElementById('connection-error').hidden = false
			})
		}

		port.onMessage.addListener(messageHandlerCore)

		port.postMessage({
			name: 'init',
			tabId: browser.devtools.inspectedWindow.tabId
		})

		// The checking for if the page is scriptable is done at the other end.
		send({ name: 'get-landmarks' })
		send({ name: 'get-toggle-state' })
		send({ name: 'get-mutation-info' })
	} else {
		makeEventHandlers('help')
		makeEventHandlers('settings')

		document.getElementById('mutation-observation-station').remove()

		// The message could be coming from any content script or other GUI, so
		// it needs to be filtered. (The background script filters out messages
		// for the DevTools panel.)
		browser.runtime.onMessage.addListener(function(message, sender) {
			browser.tabs.query({ active: true, currentWindow: true }, tabs => {
				const activeTabId = tabs[0].id
				if (!sender.tab || sender.tab.id === activeTabId) {
					messageHandlerCore(message, sender)
				}
			})
		})

		// Most GUIs can check that they are running on a content-scriptable
		// page (DevTools doesn't have access to browser.tabs).
		browser.tabs.query({ active: true, currentWindow: true }, tabs => {
			browser.tabs.get(tabs[0].id, function(tab) {
				if (!isContentScriptablePage(tab.url)) {
					handleLandmarksMessage(null)
					return
				}
				browser.tabs.sendMessage(tab.id, { name: 'get-landmarks' })
				browser.tabs.sendMessage(tab.id, { name: 'get-toggle-state' })
			})
		})
	}

	document.getElementById('show-all').addEventListener('change', function() {
		send({ name: 'toggle-all-landmarks' })
	})

	translate()
}

main()
