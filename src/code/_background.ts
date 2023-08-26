/* eslint-disable no-prototype-builtins */
import './compatibility'
import contentScriptInjector from './contentScriptInjector.js'
import { isContentScriptablePage } from './isContent.js'
import { defaultInterfaceSettings, defaultDismissedUpdate } from './defaults.js'
import { withActiveTab, withAllTabs } from './withTabs.js'
import MigrationManager from './migrationManager.js'

const devtoolsConnections: Record<number, chrome.runtime.Port> = {}
const startupCode: (() => void)[]  = []
// TODO: do the typing properly
let dismissedUpdate: boolean = defaultDismissedUpdate.dismissedUpdate


//
// Utilities
//

function isDevToolsMessage(message: object): message is MessageFromDevTools {
	return Object.hasOwn(message, 'from')
}

function debugLog(thing: string | MessageForBackgroundScript | MessageFromDevTools, sender?: chrome.runtime.MessageSender) {
	if (typeof thing === 'string') {
		// Debug message from this script
		console.log('bkg:', thing)
	} else if (thing.name === 'debug') {
		// Debug message from somewhere
		if (sender?.tab) {
			console.log(`${sender.tab.id}: ${thing.info}`)
		} else if (thing.from) {
			console.log(`${thing.from}: ${thing.info}`)
		} else {
			console.log(`extension page: ${thing.info}`)
		}
	} else {
		// A general message from somewhere
		// TODO: does this exist?
		// eslint-disable-next-line no-lonely-if
		if (sender?.tab) {
			console.log(`bkg: rx from ${sender.tab.id}: ${thing.name}`)
		} else if (isDevToolsMessage(thing)) {
			console.log(`bkg: rx from ${thing.from} devtools: ${thing.name}`)
		} else {
			console.log(`bkg: rx from somewhere: ${thing.name}`)
		}
	}
}

function setBrowserActionState(tabId: number, url: string) {
	if (isContentScriptablePage(url)) {
		browser.browserAction.enable(tabId)
	} else {
		browser.browserAction.disable(tabId)
	}
}

function sendToDevToolsForTab(tab: chrome.tabs.Tab | undefined, message: object) {
	if (tab?.id) {
		if (devtoolsConnections.hasOwnProperty(tab.id)) {
			devtoolsConnections[tab.id].postMessage(message)
		}
	} // TODO: else: log an error or something?
}

// If the content script hasn't started yet (e.g. on browser load, restoring
// many tabs), ignore an error when trying to talk to it. It'll talk to us.
//
// I tried avoiding sending to tabs whose status was not 'complete' but that
// resulted in messages not being sent even when the content script was ready.
function wrappedSendToTab(id: number, message: MessageForContentScript) {
	browser.tabs.sendMessage(id, message, () => browser.runtime.lastError)
}

function updateGUIs(tabId: number, url: string) {
	if (isContentScriptablePage(url)) {
		debugLog(`update UI for ${tabId}: requesting info`)
		wrappedSendToTab(tabId, { name: 'get-landmarks' })
		wrappedSendToTab(tabId, { name: 'get-toggle-state' })
	} else {
		debugLog(`update UI for ${tabId}: non-scriptable page`)
		if (BROWSER === 'firefox' || BROWSER === 'opera') {
			browser.runtime.sendMessage(
				{ name: 'landmarks', data: null }, () =>
					browser.runtime.lastError)  // noop
		}
		// DevTools panel doesn't need updating, as it maintains state
	}
}


//
// Setting up and handling DevTools connections
//

function devtoolsListenerMaker(port: chrome.runtime.Port) {
	// DevTools connections come from the DevTools panel, but the panel is
	// inspecting a particular web page, which has a different tab ID.
	return function(message: MessageFromDevTools) {
		debugLog(message)
		switch (message.name) {
			case 'init':
				devtoolsConnections[message.from] = port
				port.onDisconnect.addListener(
					devtoolsDisconnectMaker(message.from))
				sendDevToolsStateMessage(message.from, true)
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
					if (tab.url && tab.id && isContentScriptablePage(tab.url)) {
						browser.tabs.sendMessage(tab.id, message)
					} else {
						port.postMessage({ name: 'landmarks', data: null })
					}
				})
		}
	}
}

function devtoolsDisconnectMaker(tabId: number) {
	return function() {
		browser.tabs.get(tabId, function(tab) {
			if (!browser.runtime.lastError) {  // check tab was not closed
				if (tab.url && tab.id && isContentScriptablePage(tab.url)) {
					sendDevToolsStateMessage(tab.id, false)
				}
			}
		})
		delete devtoolsConnections[tabId]
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
			throw Error(`Unkown connection type "${port.name}".`)
	}
})

function sendDevToolsStateMessage(tabId: number, panelIsOpen: boolean) {
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

function switchInterface(mode: 'sidebar' | 'popup') {
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
			throw Error(`Invalid interface "${mode}" given.`)
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
			withActiveTab(tab => {
				if (tab.url && tab.id && isContentScriptablePage(tab.url)) {
					browser.tabs.sendMessage(tab.id, { name: command })
				}
			})
	}
})


//
// Navigation and tab activation events
//

// Stop the user from being able to trigger the browser action during page load.
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
	setBrowserActionState(details.tabId, details.url)
	debugLog(`tab ${details.tabId} navigated - ${details.url}`)
	updateGUIs(details.tabId, details.url)
})

// If the page uses single-page app techniques to load in new components—as
// YouTube and GitHub do—then the landmarks can change. We assume that if the
// structure of the page is changing so much that it is effectively a new page,
// then the developer would've followed best practice and used the History API
// to update the URL of the page, so that this 'new' page can be recognised as
// such and be bookmarked by the user. Therefore we monitor for use of the
// History API to trigger a new search for landmarks on the page.
//
// Thanks: http://stackoverflow.com/a/36818991/1485308
//
// Note:
// - GitHub repo-exploring transitions: this fires two times on Firefox (with
//   both URL fields the same) and three times on Chrome (with some URL fields
//   being the start URL and some being the finishing URL).
// - YouTube transitions from playing to suggested video: this only fires once,
//   with the new URL.
// - The original code had a fliter such that this would only fire if the URLs
//   of the current tab and the details object matched. This seems to work very
//   well on most pages, but I noticed at least one case where it did not
//   (moving to a repo's Graphs page on GitHub). Seeing as this only sends a
//   short message to the content script, I've removed the 'same URL'
//   filtering.
browser.webNavigation.onHistoryStateUpdated.addListener(function(details) {
	if (details.frameId > 0) return
	if (isContentScriptablePage(details.url)) {  // TODO: check needed?
		debugLog(`tab ${details.tabId} history - ${details.url}`)
		wrappedSendToTab(details.tabId, { name: 'trigger-refresh' })
	}
})

browser.tabs.onActivated.addListener(function(activeTabInfo) {
	browser.tabs.get(activeTabInfo.tabId, function(tab) {
		debugLog(`tab ${activeTabInfo.tabId} activated - ${tab.url}`)
		updateGUIs(tab.id!, tab.url!)
	})
	// Note: on Firefox, if the tab hasn't started loading yet, its URL comes
	//       back as "about:blank" which makes Landmarks think it can't run on
	//       that page, and sends the null landmarks message, which appears
	//       briefly before the DOM load event causes webNavigation.onCompleted
	//       to fire and the content script is asked for and sends back the
	//       actual landmarks.
})


//
// Install and update
//

function reflectUpdateDismissalState(dismissed: boolean) {
	dismissedUpdate = dismissed
	if (dismissedUpdate) {
		browser.browserAction.setBadgeText({ text: '' })
		withActiveTab(tab => updateGUIs(tab.id!, tab.url!))
	} else {
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
	} else if (details.reason === 'update') {
		browser.storage.sync.set({ 'dismissedUpdate': false })
	}
})


//
// Message handling
//

function openHelpPage(openInSameTab: boolean) {
	const helpPage = dismissedUpdate
		? browser.runtime.getURL('help.html')
		: browser.runtime.getURL('help.html') + '#!update'
	if (openInSameTab) {
		// Link added to Landmarks' home page should open in the same tab
		browser.tabs.update({ url: helpPage })
	} else {
		// When opened from GUIs, it should open in a new tab
		withActiveTab(tab =>
			browser.tabs.create({ url: helpPage, openerTabId: tab.id }))
	}
	if (!dismissedUpdate) {
		browser.storage.sync.set({ 'dismissedUpdate': true })
	}
}

browser.runtime.onMessage.addListener(function(message: MessageForBackgroundScript, sender: chrome.runtime.MessageSender) {
	debugLog(message, sender)
	switch (message.name) {
		// Content
		case 'landmarks':
			if (sender?.tab?.id && dismissedUpdate) {
				browser.browserAction.setBadgeText({
					text: message.number === 0 ? '' : String(message.number),
					tabId: sender.tab.id
				})
			}
			sendToDevToolsForTab(sender.tab, message)
			break
		case 'get-devtools-state':
			if (sender?.tab?.id) {
				sendDevToolsStateMessage(sender.tab.id,
					devtoolsConnections.hasOwnProperty(sender.tab.id))
			}
			break
		// Help page
		case 'get-commands':
			browser.commands.getAll(function(commands) {
				if (sender?.tab?.id) {
					browser.tabs.sendMessage(sender.tab.id, {
						name: 'populate-commands',
						commands: commands
					})
				}
			})
			break
		case 'open-configure-shortcuts':
			browser.tabs.update({
				/* eslint-disable indent */
				url:  BROWSER === 'chrome' ? 'chrome://extensions/configureCommands'
					: BROWSER === 'opera' ? 'opera://settings/keyboardShortcuts'
					: BROWSER === 'edge' ? 'edge://extensions/shortcuts'
					: ''
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
			withActiveTab(tab => sendToDevToolsForTab(tab, message))
			break
		case 'mutation-info':
		case 'mutation-info-window':
		case 'page-warnings':
			sendToDevToolsForTab(sender?.tab, message)
	}
})


//
// Actions when the extension starts up
//

withAllTabs(function(tabs) {
	for (const tab of tabs) {
		if (tab.id && tab.url) {
			setBrowserActionState(tab.id, tab.url)
		}
	}
})

if (BROWSER !== 'firefox') {
	startupCode.push(contentScriptInjector)
}

browser.storage.onChanged.addListener(function(changes) {
	if (BROWSER === 'firefox' || BROWSER === 'opera') {
		if (changes.hasOwnProperty('interface')) {
			switchInterface(changes.interface.newValue
				// @ts-ignore TODO
				?? defaultInterfaceSettings.interface)
		}
	}

	if (changes.hasOwnProperty('dismissedUpdate')) {
		// Changing _to_ false means either we've already dismissed and have
		// since reset the messages, OR we have just been updated.
		reflectUpdateDismissalState(changes.dismissedUpdate.newValue)
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
