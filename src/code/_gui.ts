// hasOwnProperty is only used on browser-provided objects and landmarks
/* eslint-disable no-prototype-builtins */
import './compatibility'
import translate from './translate.js'
import landmarkName from './landmarkName.js'
import { defaultInterfaceSettings, defaultDismissalStates, defaultDismissedSidebarNotAlone, defaultFunctionalSettings, isInterfaceType } from './defaults.js'
import { isContentScriptablePage } from './isContent.js'
import { withActiveTab } from './withTabs.js'

let closePopupOnActivate = INTERFACE === 'popup'
	? defaultFunctionalSettings.closePopupOnActivate
	: null

const _sidebarNote = {
	'dismissedSidebarNotAlone': {
		id: 'note-ui',
		cta: function() {
			void browser.runtime.openOptionsPage()
		},
		showOrHide: function(wasDismissed: boolean) {
			// Whether to show the message depends on the interface too
			browser.storage.sync.get(defaultInterfaceSettings, function(items) {
				if (items.interface === 'popup' && !wasDismissed) {
					document.getElementById('note-ui').hidden = false
				} else {
					document.getElementById('note-ui').hidden = true
				}
			})
		}
	}
}

const _updateNote = {
	'dismissedUpdate': {
		id: 'note-update',
		cta: function() {
			void browser.runtime.sendMessage({ name: 'open-help' })
			if (INTERFACE === 'popup') window.close()
		}
	}
}

interface Note {
	id: string
	cta: () => void
	showOrHide?: (wasDismissed: boolean) => void
}

type Notes = Record<string, Note>;

const notes: Notes = (INTERFACE === 'sidebar')
	? Object.assign({}, _sidebarNote, _updateNote)
	: _updateNote

let port: chrome.runtime.Port


//
// Creating a landmarks tree in response to info from content script
//

// Handle incoming landmarks message response
//
// If we got some landmarks from the page, make the tree of them. If there was
// an error, let the user know.
function handleLandmarksMessage(tree: LandmarkEntry | null) {
	const display = document.getElementById('landmarks')
	const showAllContainer = document.getElementById('show-all-label')
	removeChildNodes(display)

	// Content script would normally send back an array of landmarks
	if (Array.isArray(tree)) {
		if (tree.length === 0) {
			addText(display, browser.i18n.getMessage('noLandmarksFound'))
			showAllContainer.style.display = 'none'
		} else {
			display.appendChild(processTree(tree))
			showAllContainer.style.display = ''
		}
	} else {
		addText(display, browser.i18n.getMessage('forbiddenPage'))
		showAllContainer.style.display = 'none'
	}
}

function processTree(treeLevel: LandmarkEntry[]) {
	const thisLevelList = document.createElement('ul')

	for (const landmark of treeLevel) {
		thisLevelList.appendChild(
			processTreeLevelItem(landmark))
	}

	return thisLevelList
}

function processTreeLevelItem(landmark: LandmarkEntry) {
	// Create the <li> for this landmark
	const item = document.createElement('li')

	const shower = function() {
		send({ name: 'show-landmark', index: landmark.index })
	}

	const hider = function() {
		send({ name: 'hide-landmark', index: landmark.index })
	}

	const button = makeLandmarkButton(
		function() {
			send({ name: 'focus-landmark', index: landmark.index })
			if (INTERFACE === 'popup' && closePopupOnActivate) {
				window.close()
			}
		},
		shower,
		hider,
		landmarkName(landmark))

	item.appendChild(button)

	if (INTERFACE === 'devtools') {
		addInspectButton(item, landmark)

		// TODO: come back to this check; can we make it not needed?
		// When the content script first starts, it assumes that DevTools
		// aren't open. The background script will request a GUI update and
		// whilst unlikely, this might happen before the content script has
		// learnt that DevTools are open.
		if (landmark.hasOwnProperty('warnings')) {
			if (landmark.warnings!.length > 0) {
				addElementWarnings(item, landmark, landmark.warnings!)
			}
		} else {
			debugSend('no warnings for ' + landmark.role)
		}
	}

	if (landmark.contains) {  // landmarksFinder ensures >0 entries if present
		item.appendChild(processTree(landmark.contains))
	}

	return item
}

function addInspectButton(root: HTMLElement, landmark: LandmarkEntry) {
	const inspectButton = makeInspectButton(
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

function addElementWarnings(root: HTMLElement, landmark: LandmarkEntry, array: PageWarning[]) {
	const details = document.createElement('details')
	details.className = 'tooltip'
	const summary = document.createElement('summary')
	summary.setAttribute('class', 'lint-warning')
	summary.setAttribute('aria-label',
		browser.i18n.getMessage('lintWarningPrefix') + ' ' + landmark.role)
	details.appendChild(summary)
	makeWarnings(details, array)
	root.appendChild(details)
}

// TODO: Is there a DOM API for this?
function removeChildNodes(element: HTMLElement) {
	while (element.firstChild) {
		element.removeChild(element.firstChild)
	}
}

// Append text paragraph to the given element
function addText(element: HTMLElement, message: string) {
	const newPara = document.createElement('p')
	const newParaText = document.createTextNode(message)
	newPara.appendChild(newParaText)
	element.appendChild(newPara)
}

function makeLandmarkButton(onClick: () => void, shower: () => void, hider: () => void, text: string) {
	const button = document.createElement('button')
	button.appendChild(document.createTextNode(text))
	button.addEventListener('click', onClick)
	button.addEventListener('focus', shower)
	button.addEventListener('mouseenter', shower)
	button.addEventListener('blur', hider)
	button.addEventListener('mouseleave', hider)
	return button
}

function makeInspectButton(onClick: () => void, text: string, cssClass: string, context: string) {
	const button = document.createElement('button')
	button.className = cssClass
	button.setAttribute('aria-label', text + ' ' + context)
	button.addEventListener('click', onClick)
	return button
}


//
// Showing page warnings in DevTools
//

function handlePageWarningsMessage(warnings: PageWarning[]) {
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

function makeWarnings(root: HTMLElement, warningKeys: PageWarning[]) {
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

function showOrHideNote(note: Note, dismissed: boolean) {
	if (note.showOrHide) {
		note.showOrHide(dismissed)
	} else if (dismissed) {
		document.getElementById(note.id)!.hidden = true
	} else {
		document.getElementById(note.id)!.hidden = true
	}
}

// Sidebar-specific: handle the user changing their UI preference (the sidebar
// may be open, so the note needs to be shown/hidden in real-time).
function reflectInterfaceChange(ui: 'sidebar' | 'popup') {
	browser.storage.sync.get(defaultDismissedSidebarNotAlone, function(items) {
		if (items.dismissedSidebarNotAlone === false) {
			if (ui === 'sidebar') {
				document.getElementById('note-ui').hidden = true
			} else {
				document.getElementById('note-ui').hidden = false
			}
		}
	})
}

function setupNotes() {
	for (const [dismissalSetting, note] of Object.entries(notes)) {
		const ctaId = `${note.id}-cta`
		const dismissId = `${note.id}-dismiss`
		document.getElementById(ctaId)!.addEventListener('click', note.cta)
		document.getElementById(dismissId)!.addEventListener(
			'click', function() {
				void browser.storage.sync.set({ [dismissalSetting]: true })
			})
	}

	browser.storage.onChanged.addListener(function(changes) {
		if (INTERFACE === 'sidebar') {
			if (changes.hasOwnProperty('interface') && isInterfaceType(changes.interface.newValue)) {
				reflectInterfaceChange(changes.interface.newValue ??
					defaultInterfaceSettings!.interface)
			}
		}

		for (const dismissalState in defaultDismissalStates) {
			if (changes.hasOwnProperty(dismissalState)) {
				showOrHideNote(
					notes[dismissalState],
					Boolean(changes[dismissalState].newValue))  // TODO: ensure at source and ignore, or check here
			}
		}
	})

	browser.storage.sync.get(defaultDismissalStates, function(items) {
		for (const dismissalState in defaultDismissalStates) {
			if (notes.hasOwnProperty(dismissalState)) {
				showOrHideNote(notes[dismissalState], Boolean(items[dismissalState]))  // TODO: ensure at source and ignore, or check here
			}
		}
	})
}


//
// Management
//

function makeEventHandlers(linkName: 'help' | 'settings') {
	const link = document.getElementById(linkName)
	const core = () => {
		void browser.runtime.sendMessage({ name: `open-${linkName}` })
		if (INTERFACE === 'popup') window.close()
	}

	link.addEventListener('click', core)
	link.addEventListener('keydown', function(event) {
		if (event.key === 'Enter') core()
	})
}

// TODO: this leaves an anonymous code block in the devtools script
function send(message: string | object) {
	if (INTERFACE === 'devtools') {
		const messageWithTabId = Object.assign({}, message, {
			from: browser.devtools.inspectedWindow.tabId
		})
		port.postMessage(messageWithTabId)
	} else {
		// TODO: Is this ever going to be called with an active tab that doesn't have an id?
		withActiveTab(tab => {
			void browser.tabs.sendMessage(tab.id!, message)
		})
	}
}

function debugSend(what: string) {
	const message: DebugMessageForBackgroundScript = { name: 'debug', info: what }
	if (INTERFACE === 'devtools') {
		message.from = `devtools ${browser.devtools.inspectedWindow.tabId}`
		port.postMessage(message)
	} else {
		message.from = INTERFACE
		void browser.runtime.sendMessage(message)
	}
}

function isMessageForBackgroundScript(thing: unknown): thing is MessageForBackgroundScript {
	return typeof thing === 'object'
}

function messageHandlerCore(message: MessageForBackgroundScript) {
	if (message.name === 'landmarks') {
		handleLandmarksMessage(message.tree)
		if (INTERFACE === 'devtools') send({ name: 'get-page-warnings' })
	} else if (message.name === 'toggle-state-is') {
		handleToggleStateMessage(message.data)
	} else if (INTERFACE === 'devtools' && message.name === 'mutation-info') {
		// FIXME: The message from the msr called 'mutation-info' doesn't match the structure of the typed one.
		handleMutationMessage(message.data)
	} else if (INTERFACE === 'devtools' && message.name === 'mutation-info-window') {
		handleMutationWindowMessage(message.data)
	} else if (INTERFACE === 'devtools' && message.name === 'page-warnings') {
		handlePageWarningsMessage(message.data)
	}
}

function handleToggleStateMessage(state: ToggleState) {
	const box = document.getElementById('show-all')
	box.checked = state === 'selected' ? false : true
}

function handleMutationMessage(data: MutationInfoMessageData) {
	for (const key in data) {
		const string = key === 'average'
			? data[key as keyof typeof data]!.toFixed(1)
			: String(data[key as keyof typeof data]!)
		document.getElementById(key)!.textContent = string
	}
	if ('duration' in data && 'average' in data) {
		document.getElementById('was-last-scan-longer-than-average').innerText = 
			data.duration! > data.average! ? 'yes' : 'no'
	}
}

function handleMutationWindowMessage(data: MutationInfoWindowMessageData) {
	for (const key in data) {
		const table = document.getElementById(key)!
		const row = table.querySelector('tr')!
		for (let i = 0; i < data[key as keyof typeof data].length; i++) {
			(row.children[i] as HTMLElement).innerText = String(data[key as keyof typeof data][i])
			row.children[i].className = data[key as keyof typeof data][i] >= 1 ? 'warning' : ''
		}
	}
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
		from: browser.devtools.inspectedWindow.tabId
	})

	// The checking for if the page is scriptable is done at the other end.
	send({ name: 'get-landmarks' })
	send({ name: 'get-toggle-state' })
	send({ name: 'get-mutation-info' })

	// TODO: Eventually remove, after sorting out mutation handling
	browser.storage.onChanged.addListener(function(changes) {
		if ('handleMutationsViaTree' in changes) {
			document.getElementById('handling-mutations-via-tree').innerText =
				String(changes.handleMutationsViaTree.newValue)
		}
	})
	browser.storage.sync.get(defaultFunctionalSettings, function(items) {
		document.getElementById('handling-mutations-via-tree').innerText =
			String(items.handleMutationsViaTree)
	})
}

function startupPopupOrSidebar() {
	makeEventHandlers('help')
	makeEventHandlers('settings')

	// The message could be coming from any content script or other GUI, so
	// it needs to be filtered. (The background script filters out messages
	// for the DevTools panel.)
	browser.runtime.onMessage.addListener(function(message, sender) {
		withActiveTab(tab => {
			const activeTabId = tab.id
			if (!sender.tab || sender.tab.id === activeTabId) {
				if (isMessageForBackgroundScript(message)) {
					messageHandlerCore(message)
				}
			}
		})
	})

	// Most GUIs can check that they are running on a content-scriptable
	// page (DevTools doesn't have access to browser.tabs).
	// TODO: might this ever be called when the active tab doesn't have an id/url?
	withActiveTab(tab =>
		browser.tabs.get(tab.id!, function(tab) {
			if (!isContentScriptablePage(tab.url!)) {
				handleLandmarksMessage(null)
				return
			}
			void browser.tabs.sendMessage(tab.id!, { name: 'get-landmarks' })
			void browser.tabs.sendMessage(tab.id!, { name: 'get-toggle-state' })
		}))

	document.getElementById('version').innerText =
		browser.runtime.getManifest().version

	setupNotes()

	if (INTERFACE === 'popup') {
		// Get close-on-activate pref. We don't need to monitor for changes:
		// only the pop-up is affected, and the user almost certainly won't
		// change a pop-up-related setting whilst a pop-up is open.
		browser.storage.sync.get(defaultFunctionalSettings, function(items) {
			closePopupOnActivate = Boolean(items.closePopupOnActivate)
		})
	}
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
