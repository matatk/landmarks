/* eslint-disable no-prototype-builtins */
import './compatibility'
import contentScriptInjector from './contentScriptInjector'
import { isContentScriptablePage } from './isContent'
import { defaultInterfaceSettings, defaultDismissedUpdate } from './defaults'
import MigrationManager from './migrationManager'

const devtoolsConnections = {}
const startupCode = []
let dismissedUpdate = defaultDismissedUpdate.dismissedUpdate


//
// Utilities
//

// This is stripped by the build script when not in debug mode
function debugLog(message, domain) {
	console.log((domain ? domain : 'bkg') + ': ' + message)
}

function checkBrowserActionState(tabId, url) {
	if (isContentScriptablePage(url)) {
		browser.browserAction.enable(tabId)
	} else {
		browser.browserAction.disable(tabId)
	}
}

function sendToDevToolsForTab(tabId, message) {
	if (devtoolsConnections.hasOwnProperty(tabId)) {
		devtoolsConnections[tabId].postMessage(message)
	}
}

function updateGUIs(tabId, url) {
	debugLog('updateGUIs()')
	if (isContentScriptablePage(url)) {
		debugLog('updateGUIs(): asking for landmarks')
		browser.tabs.sendMessage(tabId, { name: 'get-landmarks' })
		debugLog('updateGUIs(): asking for toggle state')
		browser.tabs.sendMessage(tabId, { name: 'get-toggle-state' })
	} else {
		debugLog('updateGUIs(): non-scriptable page')
		browser.runtime.sendMessage({ name: 'landmarks', data: null })
		// DevTools panel doesn't need updating, as it maintains state
	}
}


//
// Setting up and handling DevTools connections
//

function devtoolsListenerMaker(port) {
	// DevTools connections come from the DevTools panel, but the panel is
	// inspecting a particular web page, which has a different tab ID.
	return function(message) {
		debugLog(message.name, 'dev')
		switch (message.name) {
			case 'init':
				devtoolsConnections[message.tabId] = port
				port.onDisconnect.addListener(function() {
					browser.tabs.get(message.tabId, function(tab) {
						if (isContentScriptablePage(tab.url)) {
							sendDevToolsStateMessage(tab.id, false)
						}
					})
					delete devtoolsConnections[message.tabId]
				})
				sendDevToolsStateMessage(message.tabId, true)
				break
			case 'get-landmarks':
			case 'get-toggle-state':
			case 'focus-landmark':
			case 'toggle-all-landmarks':
			case 'get-mutation-info':
			case 'get-page-warnings':
				// The DevTools panel can't check if it's on a scriptable
				// page, so we do that here. Other GUIs check themselves.
				browser.tabs.get(message.from, function(tab) {
					if (isContentScriptablePage(tab.url)) {
						browser.tabs.sendMessage(tab.id, message)
					} else {
						port.postMessage({
							name: 'landmarks',
							data: null
						})
					}
				})
		}
	}
}

browser.runtime.onConnect.addListener(function(port) {
	switch (port.name) {
		case 'devtools':
			port.onMessage.addListener(devtoolsListenerMaker(port))
			break
		case 'disconnect-checker':  // Used on Chrome and Opera
			break
		default:
			throw Error(`Unkown connection type ${port.name}`)
	}
})

function sendDevToolsStateMessage(tabId, panelIsOpen) {
	browser.tabs.sendMessage(tabId, {
		name: 'devtools-state',
		state: panelIsOpen ? 'open' : 'closed'
	})
}


//
// Sidebar handling
//

// If the user has elected to use the sidebar, the pop-up is disabled, and we
// will receive events, which we can then use to open the sidebar.
//
// Opera doesn't have open().
//
// These things are only referenced from within browser-conditional blocks, so
// Terser removes them as appropriate.

const sidebarToggle = () => browser.sidebarAction.toggle()

function switchInterface(mode) {
	switch (mode) {
		case 'sidebar':
			browser.browserAction.setPopup({ popup: '' })
			if (BROWSER === 'firefox') {
				browser.browserAction.onClicked.addListener(sidebarToggle)
			}
			break
		case 'popup':
			// On Firefox this could be set to null to return to the default
			// popup. However Chrome/Opera doesn't support this.
			browser.browserAction.setPopup({ popup: 'popup.html' })
			if (BROWSER === 'firefox') {
				browser.browserAction.onClicked.removeListener(sidebarToggle)
			}
			break
		default:
			throw Error(`Invalid interface "${mode}" given`)
	}
}

if (BROWSER === 'firefox' || BROWSER === 'opera') {
	startupCode.push(function() {
		browser.storage.sync.get(defaultInterfaceSettings, function(items) {
			switchInterface(items.interface)
		})
	})
}


//
// Keyboard shortcut handling
//

browser.commands.onCommand.addListener(function(command) {
	switch (command) {
		case 'next-landmark':
		case 'prev-landmark':
		case 'main-landmark':
		case 'toggle-all-landmarks':
			browser.tabs.query({ active: true, currentWindow: true }, tabs => {
				if (isContentScriptablePage(tabs[0].url)) {
					browser.tabs.sendMessage(tabs[0].id, { name: command })
				}
			})
	}
})


//
// Navigation and tab activation events
//

// Listen for URL change events on all tabs and disable the browser action if
// the URL does not start with 'http://' or 'https://' (or 'file://', for
// local pages).
//
// Note: This used to be wrapped in a query for the active tab, but on browser
//       startup, URL changes are going on in all tabs.
browser.webNavigation.onBeforeNavigate.addListener(function(details) {
	if (details.frameId > 0) return
	browser.browserAction.disable(details.tabId)
	if (dismissedUpdate) {
		browser.browserAction.setBadgeText({
			text: '',
			tabId: details.tabId
		})
	}
})

browser.webNavigation.onCompleted.addListener(function(details) {
	if (details.frameId > 0) return
	checkBrowserActionState(details.tabId, details.url)
	debugLog('web navigation completed')
	updateGUIs(details.tabId, details.url)
})

// If the page uses 'single-page app' techniques to load in new components --
// as YouTube and GitHub do -- then the landmarks can change. We assume that if
// the structure of the page is changing so much that it is effectively a new
// page, then the developer would've followed best practice and used the
// History API to update the URL of the page, so that this 'new' page can be
// recognised as such and be bookmarked by the user. Therefore we monitor for
// use of the History API to trigger a new search for landmarks on the page.
//
// Thanks: http://stackoverflow.com/a/36818991/1485308
//
// Note: The original code had a fliter such that this would only fire if the
//       URLs of the current tab and the details object matched. This seems to
//       work very well on most pages, but I noticed at least one case where it
//       did not (moving to a repo's Graphs page on GitHub). Seeing as this
//       only sends a short message to the content script, I've removed the
//       'same URL' filtering.
//
// TODO: In some circumstances (most GitHub transitions, this fires two times
//       on Firefox and three times on Chrome. For YouTube, some transitions
//       only cause this to fire once. Could it be to do with
//       <https://developer.chrome.com/extensions/background_pages#filters>?
//       Or could it be because we're not checking if the state *was* updated?
//
// TODO: Wouldn't these changes be caught by mutation observervation?
browser.webNavigation.onHistoryStateUpdated.addListener(function(details) {
	if (details.frameId > 0) return
	if (isContentScriptablePage(details.url)) {
		browser.tabs.sendMessage(details.tabId, { name: 'trigger-refresh' })
	}
})

browser.tabs.onActivated.addListener(function(activeTabInfo) {
	browser.tabs.get(activeTabInfo.tabId, function(tab) {
		debugLog('tab activated')
		updateGUIs(tab.id, tab.url)
	})
	// Note: on Firefox, if the tab hasn't started loading yet, it's URL comes
	//       back as "about:blank" which makes Landmarks think it can't run on
	//       that page, and sends the null landmarks message, which appears
	//       briefly before the content script sends back the actual landmarks.
})


//
// Install and update
//

// The second parameter is only needed when messages are later un-dismissed, so
// that we don't start modifying the badge again.
function reflectUpdateDismissalState(dismissed, doNotBadge) {
	dismissedUpdate = dismissed
	if (dismissedUpdate) {
		browser.browserAction.setBadgeText({ text: '' })
		browser.tabs.query({ active: true, currentWindow: true }, tabs => {
			debugLog('update dismissed')
			updateGUIs(tabs[0].id, tabs[0].url)
		})
	} else if (!doNotBadge) {
		browser.browserAction.setBadgeText(
			{ text: browser.i18n.getMessage('badgeNew') })
	}
}

startupCode.push(function() {
	browser.storage.sync.get(defaultDismissedUpdate, function(items) {
		reflectUpdateDismissalState(items.dismissedUpdate)
	})
})

browser.runtime.onInstalled.addListener(function(details) {
	if (details.reason === 'install') {
		browser.tabs.create({ url: 'help.html#!install' })
		browser.storage.sync.set({ 'dismissedUpdate': true })
	}
})


//
// Message handling
//

function openHelpPage(openInSameTab) {
	const helpPage = dismissedUpdate
		? browser.runtime.getURL('help.html')
		: browser.runtime.getURL('help.html') + '#!update'
	if (openInSameTab) {
		// Link added to Landmarks' home page should open in the same tab
		browser.tabs.update({ url: helpPage })
	} else {
		// When opened from GUIs, it should open in a new tab
		browser.tabs.query({ active: true, currentWindow: true }, tabs => {
			browser.tabs.create({
				url: helpPage,
				openerTabId: tabs[0].id
			})
		})
	}
	if (!dismissedUpdate) {
		browser.storage.sync.set({ 'dismissedUpdate': true })
	}
}

browser.runtime.onMessage.addListener(function(message, sender) {
	debugLog(message.name, 'ext')
	switch (message.name) {
		// Content
		case 'landmarks':
			if (dismissedUpdate) {
				browser.browserAction.setBadgeText({
					text: message.data.length <= 0
						? '' : String(message.data.length),
					tabId: sender.tab.id
				})
			}
			sendToDevToolsForTab(sender.tab.id, message)
			break
		case 'get-devtools-state':
			sendDevToolsStateMessage(sender.tab.id,
				devtoolsConnections.hasOwnProperty(sender.tab.id))
			break
		// Help page
		case 'get-commands':
			browser.commands.getAll(function(commands) {
				browser.tabs.sendMessage(sender.tab.id, {
					name: 'populate-commands',
					commands: commands
				})
			})
			break
		case 'open-configure-shortcuts':
			browser.tabs.update({
				/* eslint-disable indent */
				url:  BROWSER === 'chrome' ? 'chrome://extensions/configureCommands'
					: BROWSER === 'opera' ? 'opera://settings/keyboardShortcuts'
					: BROWSER === 'edge' ? 'edge://extensions/shortcuts'
					: null
				/* eslint-enable indent */
				// Note: the Chromium URL is now chrome://extensions/shortcuts
				//       but the original one is redirected.
			})
			break
		case 'open-settings':
			browser.runtime.openOptionsPage()
			break
		// Pop-up, sidebar and big link added to Landmarks' home page
		case 'open-help':
			openHelpPage(message.openInSameTab === true)
			break
		// Messages that need to be passed through to DevTools only
		case 'toggle-state-is':
			browser.tabs.query({ active: true, currentWindow: true }, tabs => {
				// TODO: Got an "Error handling response: TypeError: Cannot
				//       read property 'id' of undefined" in Chrome once:
				sendToDevToolsForTab(tabs[0].id, message)
			})
			break
		case 'mutation-info':
		case 'page-warnings':
			sendToDevToolsForTab(sender.tab.id, message)
	}
})


//
// Actions when the extension starts up
//

// When the extension is loaded, if it's loaded into a page that is not an
// HTTP(S) page, then we need to disable the browser action button.  This is
// not done by default on Chrome or Firefox.
browser.tabs.query({}, function(tabs) {
	for (const i in tabs) {
		checkBrowserActionState(tabs[i].id, tabs[i].url)
	}
})

if (BROWSER !== 'firefox') {
	startupCode.push(contentScriptInjector)
}

// Listen for UI or notification dismissal changes
browser.storage.onChanged.addListener(function(changes) {
	if (BROWSER === 'firefox' || BROWSER === 'opera') {
		if (changes.hasOwnProperty('interface')) {
			switchInterface(changes.interface.newValue)
		}
	}

	if (changes.hasOwnProperty('dismissedUpdate')) {
		// Changing _to_ false means we've already dismissed and have since
		// reset the messages, in which case we should not be badging the
		// browserAction icon.
		const dismissed = changes.dismissedUpdate.newValue
		const doNotModifyBadge = dismissed === false ? true : false
		reflectUpdateDismissalState(dismissed, doNotModifyBadge)
	}
})

const migrationManager = new MigrationManager({
	1: function(settings) {
		delete settings.debugInfo
	}
})

function runStartupCode() {
	for (const func of startupCode) {
		func()
	}
}

browser.storage.sync.get(null, function(items) {
	const changedSettings = migrationManager.migrate(items)
	if (changedSettings) {
		browser.storage.sync.clear(function() {
			browser.storage.sync.set(items, function() {
				runStartupCode()
			})
		})
	} else {
		runStartupCode()
	}
})
