/* eslint-disable no-prototype-builtins */
import { MessageName, MessagePayload, MessageTypes, UMessage, UMessageWithTabId, postToDev, sendToExt, sendToTab } from './messages.js'
import { isContentScriptablePage, isContentInjectablePage } from './isContent.js'
import { defaultInterfaceSettings, defaultDismissedUpdate, isInterfaceType } from './defaults.js'
import MigrationManager from './migrationManager.js'

// @ts-expect-error TODO make this neater
if (BROWSER === 'chrome') self.browser = self.chrome

// NOTE: This is done here rather than in compatibility.ts becuase of the extra check for (MV3) Chrome.
// @ts-expect-error Firefox and Opera add sidebarAction (per global defns)
if (BROWSER !== 'firefox' && BROWSER !== 'chrome') window.browser = window.chrome

const devtoolsConnections: Record<number, chrome.runtime.Port> = {}
const startupCode: ((() => Promise<void>) | (() => void))[] = []
let dismissedUpdate: boolean = defaultDismissedUpdate.dismissedUpdate


//
// Some new MV3 stuff - FIXME: to file
//

type DoWithAllTabs = (tabs: chrome.tabs.Tab[]) => Promise<void> | void
type DoWithOneTab = (tab: chrome.tabs.Tab) => Promise<void> | void

const withAllTabs: ((doThis: DoWithAllTabs) => Promise<void> | void) = BROWSER === 'chrome'
	? async function(doThis: DoWithAllTabs) {
		await browser.tabs.query({}).then(doThis)
	}
	: function(doThis: DoWithAllTabs) {
		browser.tabs.query({}, tabs => {
			void doThis(tabs)
		})
	}

// FIXME: DRY with gui
const withActiveTab: ((doThis: DoWithOneTab) => Promise<void> | void) = BROWSER === 'chrome'
	?	async function(doThis: DoWithOneTab) {
		await browser.tabs.query({ active: true, currentWindow: true }).then(async tabs => {
			await doThis(tabs[0])
		})
	}
	: function(doThis: DoWithOneTab) {
		browser.tabs.query({ active: true, currentWindow: true }, tabs => {
			void doThis(tabs[0])
		})
	}

const contentScriptInjector: (() => Promise<void> | void) = BROWSER === 'chrome'
	? async function() {
		await withAllTabs(async tabs => {
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
	: function() {
		// Inject content script manually
		void withAllTabs(function(tabs) {
			for (const tab of tabs) {
				if (isContentInjectablePage(tab.url)) {
					if (tab.id !== undefined) {
						browser.tabs.executeScript(tab.id, { file: 'content.js' },
							() => browser.runtime.lastError)
					}
				}
			}
		})
	}


//
// Utilities
//

function debugLog(thing: string | UMessage | UMessageWithTabId, sender?: chrome.runtime.MessageSender) {
	if (typeof thing === 'string') {
		// Debug message from this script
		console.log('bkg:', thing)
	} else {
		const { name, payload } = thing
		if (name === MessageName.Debug) {
			// Debug message from somewhere
			if (Object.hasOwn(payload, 'forTabId')) {
				// @ts-expect-error TODO: find a neater way of narrowing
				console.log(`${payload.forTabId} ${payload.ui}: ${payload.info}`)
			} else if (sender?.tab) {
			// TODO: This will always report 'content' as that script forwards the messages.
				console.log(`${sender.tab.id} ${payload.ui}: ${payload.info}`)
			} else {
				console.log(`${payload.ui}: ${payload.info}`)
			}
		} else {
			// A general message from somewhere
			// eslint-disable-next-line no-lonely-if
			if (payload && Object.hasOwn(payload, 'forTabId')) {
				// @ts-expect-error FIXME narrowing
				console.log(`${payload.forTabId} devtools: ${name}`)
			} else if (sender?.tab) {
				console.log(`${sender.tab.id}: ${name}`)
			} else {
				console.error(`bkg: rx from somewhere: ${thing.name}`)
			}
		}
	}
}

async function setBrowserActionState(tabId: number, url: string) {
	if (isContentScriptablePage(url)) {
		if (BROWSER === 'chrome') {
			await browser.action.enable(tabId)			
		} else {			
			await browser.browserAction.enable(tabId)			
		}
	} else {
		// eslint-disable-next-line no-lonely-if
		if (BROWSER === 'chrome') {
			await browser.action.disable(tabId)			
		} else {			
			await browser.browserAction.disable(tabId)			
		}
	}
}

// FIXME: how can the tab be undefined?
function sendToDevToolsForTab<T extends MessageTypes>(tab: chrome.tabs.Tab | undefined, name: T, payload: MessagePayload<T>) {
	if (tab?.id) {
		if (devtoolsConnections.hasOwnProperty(tab.id)) {
			postToDev(devtoolsConnections[tab.id], name, payload)
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
	sendToTab(tabId, name, payload)
}

function updateGUIs(tabId: number, url: string) {
	if (isContentScriptablePage(url)) {
		debugLog(`update UI for ${tabId}: requesting info`)
		wrappedSendToTab(tabId, MessageName.GetLandmarks, null)
		wrappedSendToTab(tabId, MessageName.GetToggleState, null)
	} else {
		debugLog(`update UI for ${tabId}: non-scriptable page`)
		if (BROWSER === 'firefox' || BROWSER === 'opera' || BROWSER === 'chrome') {
			sendToExt(MessageName.Landmarks, null)
		}
		// DevTools panel doesn't need updating, as it maintains state
	}
}


//
// Setting up and handling DevTools connections
//

// TODO: PERF: general perf, plus inline?
function stripTabId(payload: { index?: number, forTabId: number}) {
	return payload.index !== undefined ? { index: payload.index } : null
}

function devtoolsListenerMaker(port: chrome.runtime.Port) {
	// DevTools connections come from the DevTools panel, but the panel is
	// inspecting a particular web page, which has a different tab ID.
	return function(message: UMessageWithTabId) {
		const { name, payload } = message
		debugLog(message)
		switch (name) {
			case MessageName.InitDevTools:
				devtoolsConnections[payload.forTabId] = port
				port.onDisconnect.addListener(devtoolsDisconnectMaker(payload.forTabId))
				sendDevToolsStateMessage(payload.forTabId, true)
				break
			case MessageName.FocusLandmark:
			case MessageName.GetDevToolsState:
			case MessageName.GetLandmarks:
			case MessageName.GetMutationInfo:
			case MessageName.GetPageWarnings:
			case MessageName.HideLandmark:
			case MessageName.ShowLandmark:
			case MessageName.ToggleAllLandmarks:
				// The DevTools panel can't check if it's on a scriptable
				// page, so we do that here. Other GUIs check themselves.
				browser.tabs.get(payload.forTabId)
					.then(function(tab) {
						if (tab.url && tab.id && isContentScriptablePage(tab.url)) {
							sendToTab(tab.id, name, stripTabId(payload))
						} else {
							postToDev(port, MessageName.Landmarks, null)
						}
					})
					.catch(err => {
						throw err
					})
		}
	}
}

// TODO: Not the same as https://github.com/GoogleChrome/developer.chrome.com//blob/main/site/en/docs/extensions/mv3/devtools/index.md#send-messages-between-content-scripts-and-the-devtools-page--content-script-to-devtools-
function devtoolsDisconnectMaker(tabId: number) {
	return function() {
		void browser.tabs.get(tabId).then(function(tab) {
			if (tab.url && tab.id && isContentScriptablePage(tab.url)) {
				sendDevToolsStateMessage(tab.id, false)
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

// FIXME: un-factor-out? put inline manually?
function sendDevToolsStateMessage(tabId: number, panelIsOpen: boolean) {
	sendToTab(tabId, MessageName.DevToolsStateIs, { state: panelIsOpen ? 'open' : 'closed' })
}


//
// Sidebar handling
//

// If the user has elected to use the sidebar, the pop-up is disabled, and we
// will receive events, which we can then use to open the sidebar.
//
// Opera doesn't have open().

const sidebarToggleFirefox = () => browser.sidebarAction.toggle()

// FIXME: check for no switchInterface in Edge builds
const switchInterface: ((mode: UIMode) => Promise<void> | void) = BROWSER === 'chrome'
	? async function(mode: UIMode) {
		if (mode === 'sidebar') {
			await browser.action.setPopup({ popup: '' })
			chrome.sidePanel
				.setPanelBehavior({ openPanelOnActionClick: true })
				.catch((error) => console.error(error))
		} else {
			// On Firefox this could be set to null to return to the default
			// popup. However Chrome/Opera doesn't support this.
			await browser.action.setPopup({ popup: 'popup.html' })
			chrome.sidePanel
				.setPanelBehavior({ openPanelOnActionClick: false })
				.catch((error) => console.error(error))
		}
	}
	: function(mode: UIMode) {
		if (mode === 'sidebar') {
			browser.browserAction.setPopup({ popup: '' }, () =>
				browser.runtime.lastError)
			if (BROWSER === 'firefox') {
				browser.browserAction.onClicked.addListener(sidebarToggleFirefox)
			}
		} else {
			// On Firefox this could be set to null to return to the default
			// popup. However Chrome/Opera doesn't support this.
			browser.browserAction.setPopup({ popup: 'popup.html' }, () =>
				browser.runtime.lastError)
			if (BROWSER === 'firefox') {
				browser.browserAction.onClicked.removeListener(sidebarToggleFirefox)
			}
		}
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
					void withActiveTab(tab => {
						if (tab.url && tab.id && isContentScriptablePage(tab.url)) {
							sendToTab(tab.id, command as MessageName, null)  // FIXME
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
			if (BROWSER === 'chrome') {
				await browser.action.disable(details.tabId)
			} else {
				await browser.browserAction.disable(details.tabId)
			}
			if (dismissedUpdate) {
				if (BROWSER === 'chrome') {
					await browser.action.setBadgeText({
						text: '',
						tabId: details.tabId
					})
				} else {
					await browser.browserAction.setBadgeText({
						text: '',
						tabId: details.tabId
					})
				}
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

const reflectUpdateDismissalState: ((dismissed: boolean) => Promise<void> | void) = BROWSER === 'chrome'
	? async function(dismissed: boolean) {
		dismissedUpdate = dismissed
		if (dismissedUpdate) {
			await browser.action.setBadgeText({ text: '' })
			await withActiveTab(tab => updateGUIs(tab.id!, tab.url!))
		} else {	 
			await browser.action.setBadgeText(
				{ text: browser.i18n.getMessage('badgeNew') })
		}
	}
	: function(dismissed: boolean) {
		dismissedUpdate = dismissed
		if (dismissedUpdate) {
			browser.browserAction.setBadgeText({ text: '' }, () => 
				browser.runtime.lastError)
			void withActiveTab(tab => updateGUIs(tab.id!, tab.url!))
		} else {
			browser.browserAction.setBadgeText(
				{ text: browser.i18n.getMessage('badgeNew') }, () =>
					browser.runtime.lastError)
		}
	}

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
// Handling changes to non-UI user preferences
//

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

browser.runtime.onMessage.addListener(function(message: UMessage, sender: chrome.runtime.MessageSender) {
	afterInit()
		.then(async() => {
			const { name, payload } = message
			debugLog(message, sender)
			switch (name) {
			// Content
				case MessageName.Landmarks:
					if (sender?.tab?.id && dismissedUpdate) {
						if (BROWSER === 'chrome') {
							await browser.action.setBadgeText({
								text: payload?.number === 0 ? '' : String(payload?.number),
								tabId: sender.tab.id
							})
						} else {
							await browser.browserAction.setBadgeText({
								text: payload?.number === 0 ? '' : String(payload?.number),
								tabId: sender.tab.id
							})
						}
					}
					sendToDevToolsForTab(sender.tab, name, payload)
					break
				case MessageName.GetDevToolsState:
					if (sender?.tab?.id) {
						sendDevToolsStateMessage(sender.tab.id,
							devtoolsConnections.hasOwnProperty(sender.tab.id))
					}
					break
					// Help page
				case MessageName.GetCommands:
					await browser.commands.getAll().then(function(commands) {
						if (sender?.tab?.id) {
							sendToTab(sender.tab.id, MessageName.PopulateCommands, commands)
						}
					})
					break
				case MessageName.OpenConfigureShortcuts:
					await browser.tabs.update({
						url: BROWSER === 'chrome' ? 'chrome://extensions/configureCommands'
							: BROWSER === 'opera' ? 'opera://settings/keyboardShortcuts'
								: BROWSER === 'edge' ? 'edge://extensions/shortcuts'
									: ''
						// NOTE: the Chromium URL is now chrome://extensions/shortcuts
						//       but the original one is redirected.
						// FIXME: Update that and require latest Chromium (127?)
						// FIXME: Firefox?
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
					void withActiveTab(tab => sendToDevToolsForTab(tab, name, payload))
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

const runStartupCode: (() => Promise<void> | void) = BROWSER === 'chrome'
	? async function() {
		debugLog('Running startup code')
		for (const func of startupCode as (() => Promise<void>)[]) {
			await func()
		}
	}
	: function() {
		debugLog('Running startup code')
		for (const func of startupCode as (() => void)[]) {
			func()
		}
	}	

void withAllTabs(async function(tabs) {
	for (const tab of tabs) {
		if (tab.id && tab.url) {
			await setBrowserActionState(tab.id, tab.url)
		}
	}
})

const migrationManager = new MigrationManager({
	1: function(settings) {
		delete settings.debugInfo
	}
})

// FIXME: MV3 ?
if (BROWSER === 'chrome' || BROWSER === 'edge' || BROWSER === 'opera') {
	startupCode.push(contentScriptInjector)
}

if (BROWSER === 'firefox' || BROWSER === 'opera') {
	startupCode.push(function() {
		browser.storage.sync.get(defaultInterfaceSettings, function(items) {
			// TODO: Is this the right way to do falling back to default? If so, DRY.
			if (isInterfaceType(items.interface)) {
				void switchInterface(items.interface)
			} else {
				// FIXME: how to know that interface is there if browser matches?
				void switchInterface(defaultInterfaceSettings!.interface)
			}
		})
	})
} else if (BROWSER === 'chrome') {
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

if (BROWSER === 'chrome') {
	startupCode.push(async function() {
		await browser.storage.sync.get(defaultDismissedUpdate).then(async function(items) {
			await reflectUpdateDismissalState(Boolean(items.dismissedUpdate))
		})
	})
} else {
	startupCode.push(function() {
		browser.storage.sync.get(defaultDismissedUpdate, function(items) {
			void reflectUpdateDismissalState(Boolean(items.dismissedUpdate))
		})
	})
}

// NOTE: MV3
const init = BROWSER === 'chrome'
	? browser.storage.sync.get(null).then(async items => {
		const changedSettings = migrationManager.migrate(items)
		if (changedSettings) {
			await browser.storage.sync.clear().then(async function() {
				await browser.storage.sync.set(items).then(async function() {
					await (runStartupCode as () => Promise<void>)()
				})
			})
		} else {
			await (runStartupCode as () => Promise<void>)()
		}
	})
	: undefined  // code run synchronously instead - FIXME tree shake?

// NOTE: MV3
async function afterInit() {
	if (BROWSER === 'chrome') {		
		try {
			await init
		} catch (err) {
			throw Error(`Initialisation failed: ${String(err)}`)
		}
	}
}

// NOTE: MV2
if (BROWSER !== 'chrome') {
	browser.storage.sync.get(null, items => {
		const changedSettings = migrationManager.migrate(items)
		if (changedSettings) {
			browser.storage.sync.clear(function() {
				browser.storage.sync.set(items, function() {
					(runStartupCode as () => void)()
				})
			})
		} else {
			(runStartupCode as () => void)()
		}
	})
}
