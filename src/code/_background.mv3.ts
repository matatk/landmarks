/* eslint-disable no-prototype-builtins */
import { MessageName, MessagePayload, MessageTypes, ObjectyMessage, postMessage, sendMessage, sendMessageToTab } from './messages.js'
import { isContentScriptablePage } from './isContent.js'
import { defaultInterfaceSettings, defaultDismissedUpdate, isInterfaceType } from './defaults.js'
import MigrationManager from './migrationManager.js'

// @ts-expect-error TODO make this neater
self.browser = self.chrome

const devtoolsConnections: Record<number, chrome.runtime.Port> = {}  // FIXME: MV3?
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

// FIXME: if there's an error where receiving end doesn't exist in contnet script injection, it breaks everything
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
	await browser.tabs.query({}).then(tabs => {
		for (const tab of tabs) {
			if (isContentInjectablePage(tab.url)) {
				if (tab.id !== undefined) {
					browser.scripting.executeScript({
						target: { tabId: tab.id },
						files: [ 'content.js' ]
					})
						.catch(err => {
							console.error('Error injecting content script:', err, 'on tab', tab.id, tab.url)
						})
				}
			}
		}
	})
}


//
// Utilities
//

function debugLog(thing: string | ObjectyMessage, sender?: chrome.runtime.MessageSender) {
	if (typeof thing === 'string') {
		// Debug message from this script
		console.log('bkg:', thing)
	} else {
		const { name, payload } = thing
		if (name === MessageName.Debug) {
			// Debug message from somewhere
			if (payload.ui === 'devtools') {
				console.log(`${payload.forTabId} ${payload.ui}: ${payload.info}`)
			} else if (sender?.tab) {
			// TODO: This will always report 'content' as that script forwards the messages.
				console.log(`${sender.tab.id} ${payload.ui}: ${payload.info}`)
			} else {
				console.log(`Unknown target tab's ${payload.ui}: ${payload.info}`)
			}
		} else {
			// A general message from somewhere
			// TODO: does this exist?
			// eslint-disable-next-line no-lonely-if
			if (sender?.tab) {
				console.log(`bkg: rx from ${sender.tab.id}: ${name}`)
			} else {
				console.error(`bkg: rx from somewhere: ${thing.name}`)
			}
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

// FIXME: how can the tab be undefined?
function sendToDevToolsForTab<T extends MessageTypes>(tab: chrome.tabs.Tab | undefined, name: T, payload: MessagePayload<T>) {
	if (tab?.id) {
		if (devtoolsConnections.hasOwnProperty(tab.id)) {
			postMessage(devtoolsConnections[tab.id], name, payload)
		}
	} // TODO: else: log an error or something?
}

// If the content script hasn't started yet (e.g. on browser load, restoring
// many tabs), ignore an error when trying to talk to it. It'll talk to us.
//
// I tried avoiding sending to tabs whose status was not 'complete' but that
// resulted in messages not being sent even when the content script was ready.
function wrappedSendToTab<T extends MessageTypes>(tabId: number, name: T, payload: MessagePayload<T>): void {
	// FIXME: not actually doing any ignoring specifically here - should we not not ignore usually?
	sendMessageToTab(tabId, name, payload)
}

function updateGUIs(tabId: number, url: string) {
	if (isContentScriptablePage(url)) {
		debugLog(`update UI for ${tabId}: requesting info`)
		wrappedSendToTab(tabId, MessageName.GetLandmarks, null)
		wrappedSendToTab(tabId, MessageName.GetToggleState, null)
	} else {
		debugLog(`update UI for ${tabId}: non-scriptable page`)
		if (BROWSER === 'firefox' || BROWSER === 'opera' || BROWSER === 'chrome') {
			sendMessage(MessageName.Landmarks, null)
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
	return function(message: ObjectyMessage) {
		const { name, payload } = message
		debugLog(message)
		switch (name) {
			case MessageName.Init:
				devtoolsConnections[payload.forTabId] = port
				port.onDisconnect.addListener(devtoolsDisconnectMaker(payload.forTabId))
				sendDevToolsStateMessage(payload.forTabId, true).catch(err => {
					throw err
				})
				break
			case MessageName.GetLandmarks:
			case MessageName.GetDevToolsState:
			case MessageName.FocusLandmark:
			case MessageName.ToggleAllLandmarks:
			case MessageName.GetMutationInfo:
			case MessageName.GetPageWarnings:
				// The DevTools panel can't check if it's on a scriptable
				// page, so we do that here. Other GUIs check themselves.
				// FIXME: can we work out the tabId from the port instead?
				browser.tabs.get(payload.forTabId)
					.then(function(tab) {
						if (tab.url && tab.id && isContentScriptablePage(tab.url)) {
							sendMessageToTab(tab.id, name, payload)
						} else {
							postMessage(port, MessageName.Landmarks, null)
						}
					})
					.catch(err => {
						throw err
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
					port.onMessage.addListener(devtoolsListenerMaker(port))
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

const sidebarToggleFirefox = () => browser.sidebarAction.toggle()

async function switchInterface(mode: 'sidebar' | 'popup') {
	if (mode === 'sidebar') {
		await browser.action.setPopup({ popup: '' })
		if (BROWSER === 'firefox') {
			browser.action.onClicked.addListener(sidebarToggleFirefox)
		}
		if (BROWSER === 'chrome') {
			chrome.sidePanel
				.setPanelBehavior({ openPanelOnActionClick: true })
				.catch((error) => console.error(error))
		}
	} else {
		// On Firefox this could be set to null to return to the default
		// popup. However Chrome/Opera doesn't support this.
		await browser.action.setPopup({ popup: 'popup.html' })
		if (BROWSER === 'firefox') {
			browser.action.onClicked.removeListener(sidebarToggleFirefox)
		}
		if (BROWSER === 'chrome') {
			chrome.sidePanel
				.setPanelBehavior({ openPanelOnActionClick: false })
				.catch((error) => console.error(error))
		}
	}
}

if (BROWSER === 'firefox' || BROWSER === 'opera' || BROWSER === 'chrome') {
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
			updateGUIs(details.tabId, details.url)
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
				wrappedSendToTab(details.tabId, MessageName.TriggerRefresh, null)
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
				.then(tab => {
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
		await withActiveTab(tab => updateGUIs(tab.id!, tab.url!))
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

browser.runtime.onMessage.addListener(function(message: ObjectyMessage, sender: chrome.runtime.MessageSender) {
	afterInit()
		.then(async() => {
			const { name, payload } = message
			debugLog(message, sender)
			switch (name) {
			// Content
				case MessageName.Landmarks:
					if (sender?.tab?.id && dismissedUpdate) {
						await browser.action.setBadgeText({
							text: payload.number === 0 ? '' : String(payload.number),
							tabId: sender.tab.id
						})
					}
					sendToDevToolsForTab(sender.tab, name, payload)
					break
				case MessageName.GetDevToolsState:
					if (sender?.tab?.id) {
						await sendDevToolsStateMessage(sender.tab.id,
							devtoolsConnections.hasOwnProperty(sender.tab.id))
					}
					break
					// Help page
				case MessageName.GetCommands:
					await browser.commands.getAll().then(async function(commands) {
						if (sender?.tab?.id) {
							await browser.tabs.sendMessage(sender.tab.id, {
								name: 'populate-commands',
								commands: commands
							})
						}
					})
					break
				case MessageName.OpenConfigureShortcuts:
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
				case MessageName.OpenSettings:
					await browser.runtime.openOptionsPage()
					break
					// Pop-up, sidebar and big link added to Landmarks' home page
				case MessageName.OpenHelp:
					await openHelpPage(payload.openInSameTab === true)
					break
					// Messages that need to be passed through to DevTools only
				case MessageName.ToggleStateIs:
					await withActiveTab(tab => sendToDevToolsForTab(tab, name, payload))
					break
				case MessageName.MutationInfo:
				case MessageName.MutationInfoWindow:
				case MessageName.PageWarnings:
					sendToDevToolsForTab(sender?.tab, name, payload)
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
			if (BROWSER === 'firefox' || BROWSER === 'opera' || BROWSER === 'chrome') {
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
