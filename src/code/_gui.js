// hasOwnProperty is only used on browser-provided objects
/* eslint-disable no-prototype-builtins */
import './compatibility'
import translate from './translate'
import landmarkName from './landmarkName'
import { defaultInterfaceSettings, defaultDismissalStates, defaultDismissedSidebarNotAlone } from './defaults'
import { isContentScriptablePage } from './isContent'

const _sidebarNote = {
	'dismissedSidebarNotAlone': {
		id: 'note-ui',
		cta: function() {
			browser.runtime.openOptionsPage()
		},
		showOrHide: function(wasDismissed) {
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

const _updateNote = {
	'dismissedUpdate': {
		id: 'note-update',
		cta: function() {
			// FIXME DRY
			browser.runtime.sendMessage({ name: 'open-help' })
			if (INTERFACE === 'popup') window.close()
		}
	}
}

const notes = (INTERFACE === 'sidebar')
	? Object.assign({}, _sidebarNote, _updateNote)
	: _updateNote

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
		const button = makeButton(
			function() {
				send({ name: 'focus-landmark', index: index })
			},
			landmarkName(landmark))
		item.appendChild(button)

		if (INTERFACE === 'devtools') {
			addInspectButton(item, landmark)

			// FIXME: issue?
			// TODO: When the content script first starts, it assumes that
			//       DevTools aren't open. The background script will request a
			//       GUI update and whilst unlikely, this might happen before
			//       the content script has learnt that DevTools are open.
			if (landmark.hasOwnProperty('warnings')) {
				if (landmark.warnings.length > 0) {
					addElementWarnings(item, landmark, landmark.warnings)
				}
			} else {
				debugSend('no warnings for ' + landmark.role)
			}
		}

		base.appendChild(item)  // add to current base

		// Housekeeping
		previousDepth = landmark.depth
		previousItem = item
	})

	container.appendChild(root)
}

function addInspectButton(root, landmark) {
	const inspectButton = makeButton(
		function() {
			const inspectorCall = "inspect(document.querySelector('"
				+ landmark.selector  // comes from our own code
				+ "'))"
			browser.devtools.inspectedWindow.eval(inspectorCall)
		},
		browser.i18n.getMessage('inspectButtonName'),
		'examine',
		landmarkName(landmark))
	inspectButton.title = landmark.selector
	root.appendChild(inspectButton)
}

function addElementWarnings(root, landmark, array) {
	const details = document.createElement('details')
	details.className = 'tooltip'
	const summary = document.createElement('summary')
	summary.setAttribute('class', 'lint-warning')
	summary.setAttribute('aria-label',
		`Warning for ${landmark.role}`)  // FIXME: localise
	details.appendChild(summary)
	makeWarnings(details, array)
	root.appendChild(details)
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

function makeButton(onClick, text, cssClass, context) {
	const button = document.createElement('button')
	if (cssClass && context) {
		button.className = cssClass
		button.setAttribute('aria-label', text + ' ' + context)
	} else {
		button.appendChild(document.createTextNode(text))
	}
	button.addEventListener('click', onClick)
	return button
}


//
// Showing page warnings in DevTools
//

function handlePageWarningsMessage(warnings) {
	const container = document.getElementById('page-warnings-container')
	if (warnings.length === 0) {
		container.hidden = true
	} else {
		const root = document.getElementById('page-warnings')
		removeChildNodes(root)
		makeWarnings(root, warnings)
		container.hidden = false
	}
}

function makeWarnings(root, warningKeys) {
	if (warningKeys.length > 1) {
		const list = document.createElement('ul')
		for (const warningKey of warningKeys) {
			const item = document.createElement('li')
			const para = document.createElement('p')
			para.appendChild(
				document.createTextNode(browser.i18n.getMessage(warningKey)))
			item.appendChild(para)
			list.appendChild(item)
		}
		root.appendChild(list)
	} else {
		const para = document.createElement('p')
		para.appendChild(
			document.createTextNode(browser.i18n.getMessage(warningKeys[0])))
		root.appendChild(para)
	}
}


//
// Note wrangling
//

function showNote(id) {
	document.getElementById(id).hidden = false
}

function hideNote(id) {
	document.getElementById(id).hidden = true
}

function showOrHideNote(note, dismissed) {
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

function setupNotes() {
	for (const [dismissalSetting, note] of Object.entries(notes)) {
		const ctaId = `${note.id}-cta`
		const dismissId = `${note.id}-dismiss`
		document.getElementById(ctaId).addEventListener('click', note.cta)
		document.getElementById(dismissId).addEventListener(
			'click', function() {
				browser.storage.sync.set({ [dismissalSetting]: true })
			})
	}

	browser.storage.onChanged.addListener(function(changes) {
		if (INTERFACE === 'sidebar') {
			if (changes.hasOwnProperty('interface')) {
				reflectInterfaceChange(changes.interface.newValue)
			}
		}

		for (const dismissalState in defaultDismissalStates) {
			if (changes.hasOwnProperty(dismissalState)) {
				showOrHideNote(
					notes[dismissalState],
					changes[dismissalState].newValue)
			}
		}
	})

	browser.storage.sync.get(defaultDismissalStates, function(items) {
		for (const dismissalState in defaultDismissalStates) {
			if (notes.hasOwnProperty(dismissalState)) {
				showOrHideNote(notes[dismissalState], items[dismissalState])
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

// This is stripped by the build script when not in debug mode
function debugSend(what) {
	const message = { name: 'debug', info: what }
	if (INTERFACE === 'devtools') {
		message.from = `devtools ${browser.devtools.inspectedWindow.tabId}`
		port.postMessage(message)
	} else {
		message.from = INTERFACE
		browser.runtime.sendMessage(message)
	}
}

function messageHandlerCore(message) {
	if (message.name === 'landmarks') {
		handleLandmarksMessage(message.data)
		if (INTERFACE === 'devtools') {
			send({ name: 'get-page-warnings' })
		}
	} else if (message.name === 'toggle-state-is') {
		handleToggleStateMessage(message.data)
	} else if (INTERFACE === 'devtools' && message.name === 'mutation-info') {
		handleMutationMessage(message.data)
	} else if (INTERFACE === 'devtools' && message.name === 'page-warnings') {
		handlePageWarningsMessage(message.data)
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

function reflectDevToolsTheme(themeName) {
	document.documentElement.classList = `theme-${themeName}`
}


//
// Start-up
//

// Note: Firefox doesn't use 'devToolsConnectionError' but if it is not
//       mentioned here, the build will not pass the unused messages check.
//       Keeping it in the GUI HTML but hiding it is hacky, as the browser
//       really isn't using it, but at least it keeps all the code here, rather
//       than putting some separately in the build script.
function startupDevTools() {
	reflectDevToolsTheme(browser.devtools.panels.themeName)

	port = browser.runtime.connect({ name: INTERFACE })
	if (BROWSER !== 'firefox') {
		// DevTools page doesn't get reloaded when the extension does
		port.onDisconnect.addListener(function() {
			document.getElementById('connection-error').hidden = false
		})
	} else {
		browser.devtools.panels.onThemeChanged.addListener(
			reflectDevToolsTheme)
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
}

function startupPopupOrSidebar() {
	makeEventHandlers('help')
	makeEventHandlers('settings')

	// TODO: needed any more?
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

	document.getElementById('version').innerText =
		browser.runtime.getManifest().version

	setupNotes()
}

function main() {
	if (INTERFACE === 'devtools') {
		startupDevTools()
	} else {
		startupPopupOrSidebar()
	}

	document.getElementById('show-all').addEventListener('change', function() {
		send({ name: 'toggle-all-landmarks' })
	})

	translate()
	debugSend('started up')
}

main()
