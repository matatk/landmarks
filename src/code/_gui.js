import './compatibility'
import translate from './translate'
import landmarkName from './landmarkName'
import { defaultInterfaceSettings, dismissalStates } from './defaults'
import unexpectedMessageError from './unexpectedMessageError'
import { isContentScriptablePage } from './isContent'

let port = null  // DevTools-only - TODO does this get tree-shaken?


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

				const content = document.getElementById('content')
				content.insertBefore(note, content.firstChild)
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
					throw Error(`Unexpected interface type "${changes.interface.newValue}`)
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

function messageHandler(message, sender) {
	// If this GUI is not the DevTools panel, then we should check that the
	// message relates to the active tab first. If it is the DevTools panel,
	// that check has already been done by the background script, so just
	// process the message.
	if (INTERFACE !== 'devtools') {
		browser.tabs.query({ active: true, currentWindow: true }, tabs => {
			const activeTabId = tabs[0].id
			if (!sender.tab || sender.tab.id === activeTabId) {
				messageHandlerCore(message.name)
			}
		})
	} else {
		messageHandlerCore(message.name)
	}

	function messageHandlerCore(messageName) {
		switch (messageName) {
			case 'landmarks':
				handleLandmarksMessage(message.data)
				break
			case 'toggle-state-is':
				handleToggleStateMessage(message.data)
				break
			// Messages we don't handle here
			case 'toggle-all-landmarks':
				break
			case 'get-commands':
				break
			default:
				throw unexpectedMessageError(message, sender)
		}
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

// When the pop-up (or sidebar) opens, translate the heading and grab and
// process the list of page landmarks
//
// TODO: the below comment shouldn't be needed?
// Note: Firefox and Edge don't use 'devToolsConnectionError' but if it is not
//       mentioned here, the build will not pass the unused messages check.
//       This is a bit hacky, as these browsers really aren't using it, but at
//       least it keeps all the code here, rather than putting some separately
//       in the build script.
function main() {
	if (INTERFACE === 'devtools') {
		document.getElementById('links').remove()

		port = browser.runtime.connect({ name: INTERFACE })
		if (BROWSER === 'chrome' || BROWSER === 'opera') {
			// DevTools page doesn't get reloaded when the extension does
			port.onDisconnect.addListener(function() {
				// TODO use styles presently in help.css (currently hardcoded)
				const para = document.createElement('p')
				para.style.margin = '1em'
				para.style.padding = '1em'
				para.style.border = '1px solid #d00'
				para.style.borderRadius = '1em'
				const strong = document.createElement('strong')
				strong.style.color = '#d00'
				strong.appendChild(document.createTextNode(
					browser.i18n.getMessage('devToolsConnectionError')))
				para.appendChild(strong)
				document.body.insertBefore(para, document.body.firstChild)
				document.body.style.backgroundColor = '#fee'
			})
		}

		port.onMessage.addListener(messageHandler)
		port.postMessage({
			name: 'init',
			tabId: browser.devtools.inspectedWindow.tabId
		})

		// The checking for if the page is scriptable is done at the other end
		send({ name: 'get-landmarks' })
		send({ name: 'get-toggle-state' })
	} else {
		makeEventHandlers('help')
		makeEventHandlers('settings')

		browser.runtime.onMessage.addListener(messageHandler)

		// Most GUIs can check that they are running on a content-scriptable
		// page (DevTools doesn't have access to browser.tabs)
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
