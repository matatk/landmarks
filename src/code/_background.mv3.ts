/* eslint-disable no-prototype-builtins */
// @ts-expect-error TODO make this neater
self.browser = self.chrome

import { isContentScriptablePage } from './isContent.js'
import { defaultInterfaceSettings, defaultDismissedUpdate, isInterfaceType } from './defaults.js'
import MigrationManager from './migrationManager.js'

const devtoolsConnections: Record<number, chrome.runtime.Port> = {}
const startupCode: (() => Promise<void>)[]  = []
// TODO: do the typing properly
let dismissedUpdate: boolean = defaultDismissedUpdate.dismissedUpdate

const migrationManager = new MigrationManager({
	1: function(settings) {
		delete settings.debugInfo
	}
})

async function runStartupCode() {
	for (const func of startupCode) {
		await func()
	}
}


//
// Some new MV3 stuff - FIXME: to file
//

type DoWithAllTabs = (tabs: chrome.tabs.Tab[]) => Promise<void>
type DoWithOneTab = (tab: chrome.tabs.Tab) => Promise<void>
type DoWithOneTabSync = (tab: chrome.tabs.Tab) => void

async function withAllTabs(doThis: DoWithAllTabs) {
	await browser.tabs.query({}).then(doThis)
}

async function withActiveTab(doThis: DoWithOneTab | DoWithOneTabSync) {
	await browser.tabs.query({ active: true, currentWindow: true }).then(async tabs => {
		await doThis(tabs[0])
	})
}

const init = browser.storage.sync.get(null).then(async items => {
	const changedSettings = migrationManager.migrate(items)
	if (changedSettings) {
		await browser.storage.sync.clear().then(async function() {
			await browser.storage.sync.set(items).then(async function() {
				await runStartupCode()
			})
		})
	} else {
		await runStartupCode()
	}
})

async function afterInit() {
	try {
		await init
	} catch (err) {
		throw Error(`Initialisation failed: ${String(err)}`)
	}
}

// FIXME: DRY with contentScriptInjector
import { isContentInjectablePage } from './isContent.js'
async function contentScriptInjector() {
	// FIXME: MV3 - does it do this for us?
	// Inject content script manually
	await browser.tabs.query({}).then(async tabs => {
		for (const tab of tabs) {
			if (isContentInjectablePage(tab.url)) {
				if (tab.id !== undefined) {
					await browser.scripting.executeScript({
						target: { tabId: tab.id },
						files: [ 'content.js' ]
					})
				}
			}
		}
	})
}


//
// Utilities
//

// FIXME: really the best way? Also, message should be unknown?
function isDevToolsMessage(message: object): message is MessageFromDevTools {
	return Object.hasOwn(message, 'from')
}

function debugLog(thing: string | MessageForBackgroundScript | MessageFromDevTools, sender?: chrome.runtime.MessageSender) {
	if (typeof thing === 'string') {
		// Debug message from this script
		console.log('bkg:', thing)
	} else if (thing.name === 'debug') {
		// Debug message from somewhere
		if (thing.from === 'devtools') {
			console.log(`${thing.from}: ${thing.info}`)
		} else if (sender?.tab) {
			// TODO: This will always report 'content' as that script forwards the messages.
			console.log(`${sender.tab.id} ${thing.from}: ${thing.info}`)
		} else {
			console.log(`Unknown target tab's ${thing.from}: ${thing.info}`)
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

async function setBrowserActionState(tabId: number, url: string) {
	if (isContentScriptablePage(url)) {
		await browser.action.enable(tabId)
	} else {
		await browser.action.disable(tabId)
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
	browser.tabs.sendMessage(id, message).catch(err => {
		console.error(err)
	})
}

async function updateGUIs(tabId: number, url: string) {
	if (isContentScriptablePage(url)) {
		debugLog(`update UI for ${tabId}: requesting info`)
		wrappedSendToTab(tabId, { name: 'get-landmarks' })
		wrappedSendToTab(tabId, { name: 'get-toggle-state' })
	} else {
		debugLog(`update UI for ${tabId}: non-scriptable page`)
		if (BROWSER === 'firefox' || BROWSER === 'opera') {
			await browser.runtime.sendMessage({ name: 'landmarks', data: null })
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
	return async function(message: MessageFromDevTools) {
		debugLog(message)
		switch (message.name) {
			case 'init':
				devtoolsConnections[message.from] = port
				port.onDisconnect.addListener(devtoolsDisconnectMaker(message.from))
				await sendDevToolsStateMessage(message.from, true)
				break
			case 'get-landmarks':
			case 'get-toggle-state':
			case 'focus-landmark':
			case 'toggle-all-landmarks':
			case 'get-mutation-info':
			case 'get-page-warnings':
				// The DevTools panel can't check if it's on a scriptable
				// page, so we do that here. Other GUIs check themselves.
				await browser.tabs.get(message.from).then(async function(tab) {
					if (tab.url && tab.id && isContentScriptablePage(tab.url)) {
						await browser.tabs.sendMessage(tab.id, message)
					} else {
						port.postMessage({ name: 'landmarks', data: null })
					}
				})
		}
	}
}

function devtoolsDisconnectMaker(tabId: number) {
	return function() {
		void browser.tabs.get(tabId).then(async function(tab) {
			if (tab.url && tab.id && isContentScriptablePage(tab.url)) {
				await sendDevToolsStateMessage(tab.id, false)
			}
		})
		delete devtoolsConnections[tabId]
	}
}

browser.runtime.onConnect.addListener(function(port) {
	afterInit()
		.then(() => {
			switch (port.name) {
				case 'devtools':
					port.onMessage.addListener(() => devtoolsListenerMaker(port))
					break
				case 'disconnect-checker':  // Used on Chrome and Opera
					break
				default:
					throw Error(`Unkown connection type "${port.name}".`)
			}
		})
		.catch(err => {
			throw err
		})
})

async function sendDevToolsStateMessage(tabId: number, panelIsOpen: boolean) {
	await browser.tabs.sendMessage(tabId, {
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

async function switchInterface(mode: 'sidebar' | 'popup') {
	if (mode === 'sidebar') {
		await browser.action.setPopup({ popup: '' })
		if (BROWSER === 'firefox') {
			browser.action.onClicked.addListener(sidebarToggle)
		}
	} else {
		// On Firefox this could be set to null to return to the default
		// popup. However Chrome/Opera doesn't support this.
		await browser.action.setPopup({ popup: 'popup.html' })
		if (BROWSER === 'firefox') {
			browser.action.onClicked.removeListener(sidebarToggle)
		}
	}
}

if (BROWSER === 'firefox' || BROWSER === 'opera') {
	startupCode.push(async function() {
		await browser.storage.sync.get(defaultInterfaceSettings).then(async function(items) {
			// TODO: Is this the right way to do falling back to default? If so, DRY.
			if (isInterfaceType(items.interface)) {
				await switchInterface(items.interface)
			} else {
				// FIXME: how to know that interface is there if browser matches?
				await switchInterface(defaultInterfaceSettings!.interface)
			}
		})
	})
}


//
// Keyboard shortcut handling
//

browser.commands.onCommand.addListener(function(command) {
	afterInit()
		.then(() => {
			switch (command) {
				case 'next-landmark':
				case 'prev-landmark':
				case 'main-landmark':
				case 'toggle-all-landmarks':
					void withActiveTab(async tab => {
						if (tab.url && tab.id && isContentScriptablePage(tab.url)) {
							await browser.tabs.sendMessage(tab.id, { name: command })
						}
					})
			}
		})
		.catch(err => {
			throw err
		})
})


//
// Navigation and tab activation events
//

// Stop the user from being able to trigger the browser action during page load.
browser.webNavigation.onBeforeNavigate.addListener(function(details) {
	afterInit()
		.then(async() => {
			if (details.frameId > 0) return
			await browser.action.disable(details.tabId)
			if (dismissedUpdate) {
				await browser.action.setBadgeText({
					text: '',
					tabId: details.tabId
				})
			}
		})
		.catch(err => {
			throw err
		})
})

browser.webNavigation.onCompleted.addListener(function(details) {
	afterInit()
		.then(async() => {
			if (details.frameId > 0) return
			await setBrowserActionState(details.tabId, details.url)
			debugLog(`tab ${details.tabId} navigated - ${details.url}`)
			await updateGUIs(details.tabId, details.url)
		})
		.catch(err => {
			throw err
		})
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
	afterInit()
		.then(() => {
			if (details.frameId > 0) return
			if (isContentScriptablePage(details.url)) {  // TODO: check needed?
				debugLog(`tab ${details.tabId} history - ${details.url}`)
				wrappedSendToTab(details.tabId, { name: 'trigger-refresh' })
			}
		})
		.catch(err => {
			throw err
		})
})

browser.tabs.onActivated.addListener(function(activeTabInfo) {
	afterInit()
		.then(async() => {
			await browser.tabs.get(activeTabInfo.tabId)
				.then(async tab => {
					debugLog(`tab ${activeTabInfo.tabId} activated - ${tab.url}`)
					await updateGUIs(tab.id!, tab.url!)
				})
			// Note: on Firefox, if the tab hasn't started loading yet, its URL comes
			//       back as "about:blank" which makes Landmarks think it can't run on
			//       that page, and sends the null landmarks message, which appears
			//       briefly before the DOM load event causes webNavigation.onCompleted
			//       to fire and the content script is asked for and sends back the
			//       actual landmarks.
		})
		.catch(err => {
			throw err
		})
})


//
// Install and update
//

async function reflectUpdateDismissalState(dismissed: boolean) {
	dismissedUpdate = dismissed
	if (dismissedUpdate) {
		await browser.action.setBadgeText({ text: '' })
		await withActiveTab(async tab => updateGUIs(tab.id!, tab.url!))
	} else {
		await browser.action.setBadgeText(
			{ text: browser.i18n.getMessage('badgeNew') })
	}
}

// FIXME: MV3
startupCode.push(async function() {
	await browser.storage.sync.get(defaultDismissedUpdate).then(async function(items) {
		await reflectUpdateDismissalState(Boolean(items.dismissedUpdate))
	})
})

browser.runtime.onInstalled.addListener(function(details) {
	afterInit()
		.then(async() => {
			// TODO: False positive?
			// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
			if (details.reason === 'install') {
				await browser.tabs.create({ url: 'help.html#!install' })
				await browser.storage.sync.set({ 'dismissedUpdate': true })
				// TODO: False positive?
				// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
			} else if (details.reason === 'update') {
				await browser.storage.sync.set({ 'dismissedUpdate': false })
			}
		})
		.catch(err => {
			throw err
		})
})


//
// Message handling
//

async function openHelpPage(openInSameTab: boolean) {
	const helpPage = dismissedUpdate
		? browser.runtime.getURL('help.html')
		: browser.runtime.getURL('help.html') + '#!update'
	if (openInSameTab) {
		// Link added to Landmarks' home page should open in the same tab
		await browser.tabs.update({ url: helpPage })
	} else {
		// When opened from GUIs, it should open in a new tab
		await withActiveTab(async tab => {
			await browser.tabs.create({ url: helpPage, openerTabId: tab.id })
		})
	}
	if (!dismissedUpdate) {
		await browser.storage.sync.set({ 'dismissedUpdate': true })
	}
}

browser.runtime.onMessage.addListener(function(message: MessageForBackgroundScript, sender: chrome.runtime.MessageSender) {
	afterInit()
		.then(async() => {
			debugLog(message, sender)
			switch (message.name) {
			// Content
				case 'landmarks':
					if (sender?.tab?.id && dismissedUpdate) {
						await browser.action.setBadgeText({
							text: message.number === 0 ? '' : String(message.number),
							tabId: sender.tab.id
						})
					}
					sendToDevToolsForTab(sender.tab, message)
					break
				case 'get-devtools-state':
					if (sender?.tab?.id) {
						await sendDevToolsStateMessage(sender.tab.id,
							devtoolsConnections.hasOwnProperty(sender.tab.id))
					}
					break
					// Help page
				case 'get-commands':
					await browser.commands.getAll().then(async function(commands) {
						if (sender?.tab?.id) {
							await browser.tabs.sendMessage(sender.tab.id, {
								name: 'populate-commands',
								commands: commands
							})
						}
					})
					break
				case 'open-configure-shortcuts':
					await browser.tabs.update({
					/* eslint-disable indent */
					url: BROWSER === 'chrome' ? 'chrome://extensions/configureCommands'
						: BROWSER === 'opera' ? 'opera://settings/keyboardShortcuts'
						: BROWSER === 'edge' ? 'edge://extensions/shortcuts'
						: ''
					/* eslint-enable indent */
					// Note: the Chromium URL is now chrome://extensions/shortcuts
					//       but the original one is redirected.
					})
					break
				case 'open-settings':
					await browser.runtime.openOptionsPage()
					break
					// Pop-up, sidebar and big link added to Landmarks' home page
				case 'open-help':
					await openHelpPage(message.openInSameTab === true)
					break
					// Messages that need to be passed through to DevTools only
				case 'toggle-state-is':
					await withActiveTab(tab => sendToDevToolsForTab(tab, message))
					break
				case 'mutation-info':
				case 'mutation-info-window':
				case 'page-warnings':
					sendToDevToolsForTab(sender?.tab, message)
			}
		})
		.catch(err => {
			throw err 
		})
})


//
// Actions when the extension starts up
//

void withAllTabs(async function(tabs) {
	for (const tab of tabs) {
		if (tab.id && tab.url) {
			await setBrowserActionState(tab.id, tab.url)
		}
	}
})

// FIXME: MV3 ?
if (BROWSER !== 'firefox') {
	startupCode.push(() => contentScriptInjector())
}

browser.storage.onChanged.addListener(function(changes) {
	afterInit()
		.then(async function() {
			if (BROWSER === 'firefox' || BROWSER === 'opera') {
				// FIXME: rework all of these to fall back to a default value if stored one is invalid?
				if (changes.hasOwnProperty('interface') && isInterfaceType(changes.interface.newValue)) {
					await switchInterface(changes.interface.newValue
							// @ts-expect-error defaultInterfaceSettings will have this value
							?? defaultInterfaceSettings.interface)
				}
			}

			if (changes.hasOwnProperty('dismissedUpdate')) {
				// Changing _to_ false means either we've already dismissed and have
				// since reset the messages, OR we have just been updated.
				await reflectUpdateDismissalState(Boolean(changes.dismissedUpdate.newValue))
			}
		})
		.catch(err => {
			throw err
		})
})
