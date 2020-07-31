// hasOwnProperty is only used on browser-provided objects
/* eslint-disable no-prototype-builtins */
import './compatibility'
import translate from './translate'
import landmarkName from './landmarkName'
import { defaultInterfaceSettings, defaultDismissalStates, defaultDismissedSidebarNotAlone } from './defaults'
import { isContentScriptablePage } from './isContent'

const sidebarNote = {
	'dismissedSidebarNotAlone': {
		id: 'note-ui',
		cta: function() {
			browser.runtime.openOptionsPage()
		},
		showOrHide: function(wasDismissed) {
			console.log('showOrHide for UI note: dismissed?', wasDismissed)
			// Whether to show the message depends on the interface too
			browser.storage.sync.get(defaultInterfaceSettings, function(items) {
				if (items.interface === 'popup' && !wasDismissed) {
					showNote('note-ui')
				} else {
					hideNote('note-ui')
				}
			})
		}
	}
}

const updateNote = {
	'dismissedUpdate': {
		id: 'note-update',
		cta: function() {
			alert('update note thing activated')
		}
	}
}

const notes = (INTERFACE === 'sidebar')
	? Object.assign({}, sidebarNote, updateNote)
	: updateNote

let port = null


//
// Creating a landmarks tree in response to info from content script
//

// Handle incoming landmarks message response
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
		addText(display, browser.i18n.getMessage('forbiddenPage'))
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

// Append text paragraph to the given element
function addText(element, message) {
	const newPara = document.createElement('p')
	const newParaText = document.createTextNode(message)
	newPara.appendChild(newParaText)
	element.appendChild(newPara)
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


//
// Notes
//

function showNote(id) {
	console.log('showing', id)
	document.getElementById(id).hidden = false
}

function hideNote(id) {
	console.log('hiding', id)
	document.getElementById(id).hidden = true
}

function showOrHideNote(note, dismissed) {
	console.log('showOrHideNote():', note.id, dismissed)
	if (note.showOrHide) {
		note.showOrHide(dismissed)
	} else if (dismissed) {
		hideNote(note.id)
	} else {
		showNote(note.id)
	}
}

// Sidebar-specific: handle the user changing their UI preference (the sidebar
// may be open, so the note needs to be shown/hidden in real-time).
function reflectInterfaceChange(ui) {
	browser.storage.sync.get(
		defaultDismissedSidebarNotAlone,
		function(items) {
			if (items.dismissedSidebarNotAlone === false) {
				switch (ui) {
					case 'sidebar': hideNote('note-ui')
						break
					case 'popup': showNote('note-ui')
						break
					default:
						throw Error(`Unexpected interface type "${ui}"`)
				}
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

function messageHandlerCore(message) {
	if (message.name === 'landmarks') {
		handleLandmarksMessage(message.data)
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

for (const [dismissalSetting, note] of Object.entries(notes)) {
	console.log(`Setting up ${note.id}`)
	const ctaId = `${note.id}-cta`
	const dismissId = `${note.id}-dismiss`
	document.getElementById(ctaId).addEventListener('click', note.cta)
	document.getElementById(dismissId).addEventListener('click', function() {
		browser.storage.sync.set({ [dismissalSetting]: true })
	})
}

// FIXME DRY
browser.storage.onChanged.addListener(function(changes) {
	console.log('storage changed', changes)
	if (INTERFACE === 'sidebar' && changes.hasOwnProperty('interface')) {
		reflectInterfaceChange(changes.interface.newValue)
	}

	for (const dismissalState in defaultDismissalStates) {
		if (changes.hasOwnProperty(dismissalState)) {
			console.log('changed state', dismissalState)
			const isDismissed = changes[dismissalState].newValue === true
			const note = notes[dismissalState]
			showOrHideNote(note, isDismissed)
		}
	}
})

// FIXME DRY
browser.storage.sync.get(defaultDismissalStates, function(items) {
	for (const dismissalState in defaultDismissalStates) {
		if (items.hasOwnProperty(dismissalState)) {
			console.log('startup state', dismissalState)
			const isDismissed = items[dismissalState] === true
			const note = notes[dismissalState]
			showOrHideNote(note, isDismissed)
		}
	}
})
