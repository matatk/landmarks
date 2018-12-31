import './compatibility'
import contentScriptInjector from './contentScriptInjector'
import isContentScriptablePage from './isContentScriptablePage'
import { defaultInterfaceSettings } from './defaults'
import disconnectingPortErrorCheck from './disconnectingPortErrorCheck'
import Logger from './logger'

const logger = new Logger()

const contentConnections = {}
const devtoolsConnections = {}
let sidebarConnection = null
let popupConnection = null
let activeTabId = null


//
// Message routing
//

function sendLandmarksToActiveTabGUIs(fromTabId, message) {
	if (fromTabId !== activeTabId || activeTabId === null) return

	if (popupConnection) {
		popupConnection.postMessage(message)
	}

	if (BROWSER === 'firefox' || BROWSER === 'opera') {
		if (sidebarConnection) {
			sidebarConnection.postMessage(message)
		}
	}

	if (BROWSER === 'firefox' || BROWSER === 'chrome' || BROWSER === 'opera') {
		if (devtoolsConnections.hasOwnProperty(fromTabId)) {
			devtoolsConnections[fromTabId].postMessage(message)
		}
	}
}

function sendNullLandmarksToActiveTabGUIs() {
	sendLandmarksToActiveTabGUIs(activeTabId, { name: 'landmarks', data: null })
}

function getLandmarksForActiveTab() {
	if (contentConnections.hasOwnProperty(activeTabId)) {
		contentConnections[activeTabId].postMessage({ name: 'get-landmarks' } )
	} else {
		sendNullLandmarksToActiveTabGUIs()
	}
}

function sendToActiveContentScriptIfExists(message) {
	// The check is needed when a keyboard command is used
	if (contentConnections.hasOwnProperty(activeTabId)) {
		contentConnections[activeTabId].postMessage(message)
	}
}

function updateBrowserActionBadge(tabId, numberOfLandmarks) {
	browser.browserAction.setBadgeText({
		text: numberOfLandmarks <= 0 ? '' : String(numberOfLandmarks),
		tabId: tabId
	})
}


//
// Setting up and handling connections
//

// Disconnection management

function contentDisconnect(disconnectingPort) {
	logger.log(`Content script for tab ${disconnectingPort.sender.tab.id} disconnected`)
	disconnectingPortErrorCheck(disconnectingPort)
	delete contentConnections[disconnectingPort.sender.tab.id]
}

function devtoolsDisconnect(tabId) {
	logger.log(`DevTools page for tab ${tabId} disconnected`)
	delete devtoolsConnections[tabId]
}

// Message listeners

function contentListener(message, sendingPort) {
	const tabId = sendingPort.sender.tab.id

	switch (message.name) {
		case 'landmarks':
			sendLandmarksToActiveTabGUIs(tabId, message)
			updateBrowserActionBadge(tabId, message.data.length)
			break
		default:
			throw Error(`Unknown message ${JSON.stringify(message)} from content script in ${sendingPort.sender.tab.id}`)
	}
}

function popupAndSidebarListener(message) {  // also gets: sendingPort
	switch (message.name) {
		case 'get-landmarks':
			logger.log('Popup or sidebar requested landmarks')
			getLandmarksForActiveTab()
			break
		case 'focus-landmark':
			sendToActiveContentScriptIfExists(message)
			break
		default:
			throw Error(`Unknown message ${JSON.stringify(message)} from popup or sidebar`)
	}
}

function devtoolsListenerMaker(connectingPort) {
	// DevTools connections come from the DevTools panel, but the panel is
	// inspecting a particular web page, which has a different tab ID.
	return function(message) {
		switch (message.name) {
			case 'init':
				logger.log(`DevTools page for tab ${message.tabId} connected`)
				devtoolsConnections[message.tabId] = connectingPort
				connectingPort.onDisconnect.addListener(function(disconnectingPort) {
					disconnectingPortErrorCheck(disconnectingPort)
					devtoolsDisconnect(message.tabId)
				})
				break
			case 'get-landmarks':
				logger.log('DevTools requested landmarks')
				getLandmarksForActiveTab()
				break
			case 'focus-landmark':
				sendToActiveContentScriptIfExists(message)
				break
			default:
				throw Error(`Unknown message from DevTools: ${JSON.stringify(message)}`)
		}
	}
}

function splashListener(message, sendingPort) {
	switch (message.name) {
		case 'get-commands':
			browser.commands.getAll(function(commands) {
				sendingPort.postMessage({
					name: 'splash-populate-commands',
					commands: commands
				})
			})
			break
		case 'splash-open-configure-shortcuts':
			browser.tabs.update({
				// This should only appear on Chrome/Opera
				url: BROWSER === 'chrome'
					? 'chrome://extensions/configureCommands'
					: 'opera://settings/keyboardShortcuts'
			})
			break
		case 'splash-open-help':
			browser.tabs.update({
				url: browser.runtime.getURL('help.html')
			})
			break
		case 'splash-open-settings':
			browser.runtime.openOptionsPage()
			break
		default:
			throw Error(`Unknown message from splash: ${JSON.stringify(message)}`)
	}
}

browser.runtime.onConnect.addListener(function(connectingPort) {
	// Connection management

	switch (connectingPort.name) {
		case 'content':
			logger.log(`Content script for tab ${connectingPort.sender.tab.id} ${connectingPort.sender.tab.url} connected`)
			contentConnections[connectingPort.sender.tab.id] = connectingPort
			connectingPort.onMessage.addListener(contentListener)
			connectingPort.onDisconnect.addListener(contentDisconnect)
			break
		case 'devtools':
			if (BROWSER === 'firefox' || BROWSER === 'chrome' || BROWSER === 'opera') {
				connectingPort.onMessage.addListener(
					devtoolsListenerMaker(connectingPort))
			}
			break
		case 'popup':
			if (popupConnection !== null) {
				throw Error('Existing pop-up connection')
			}
			popupConnection = connectingPort
			connectingPort.onMessage.addListener(popupAndSidebarListener)
			connectingPort.onDisconnect.addListener(function() {
				popupConnection = null
			})
			break
		case 'sidebar':
			if (BROWSER === 'firefox' || BROWSER === 'opera') {
				if (sidebarConnection !== null) {
					throw Error('Existing sidebar connection')
				}
				sidebarConnection = connectingPort
				connectingPort.onMessage.addListener(popupAndSidebarListener)
				connectingPort.onDisconnect.addListener(function() {
					sidebarConnection = null
				})
			}
			break
		case 'splash':
			connectingPort.onMessage.addListener(splashListener)
			break
		default:
			throw Error(`Unkown connection type ${connectingPort.name}`)
	}
})


if (BROWSER === 'firefox' || BROWSER === 'opera') {
	//
	// Sidebar handling
	//

	// If the user has elected to use the sidebar, the pop-up is disabled, and
	// we will receive events, which we can then use to open the sidebar.
	//
	// Have to do this in a really hacky way at the moment due to
	// https://bugzilla.mozilla.org/show_bug.cgi?id=1438465
	// https://bugzilla.mozilla.org/show_bug.cgi?id=1398833
	//
	// Also Opera doesn't have open().

	// eslint-disable-next-line no-inner-declarations
	function openSidebarWhenClicked() {
		browser.browserAction.onClicked.removeListener(openSidebarWhenClicked)
		browser.sidebarAction.open()
		browser.browserAction.onClicked.addListener(closeSidebarWhenClicked)
	}

	// eslint-disable-next-line no-inner-declarations
	function closeSidebarWhenClicked() {
		browser.browserAction.onClicked.removeListener(closeSidebarWhenClicked)
		browser.sidebarAction.close()
		browser.browserAction.onClicked.addListener(openSidebarWhenClicked)
	}

	// eslint-disable-next-line no-inner-declarations
	function switchInterface(mode) {
		switch (mode) {
			case 'sidebar':
				browser.browserAction.setPopup({ popup: '' })

				if (BROWSER === 'firefox') {
					// The sidebar will be closed because we are setting
					// "open_at_install" to false. It might be nice to actually
					// show the sidebar at install, but isOpen() isn't usable
					// because it breaks propogation of the user input event.
					browser.browserAction.onClicked.addListener(
						openSidebarWhenClicked)
				}
				break
			case 'popup':
				// On Firefox this could be set to null to return to the
				// default popup. However Chrome/Opera doesn't support this.
				browser.browserAction.setPopup({ popup: 'popup.html' })

				if (BROWSER === 'firefox') {
					browser.browserAction.onClicked.removeListener(
						openSidebarWhenClicked)
					browser.browserAction.onClicked.removeListener(
						closeSidebarWhenClicked)
				}
				break
			default:
				throw Error(`Invalid interface "${mode}" given`)
		}
	}

	browser.storage.sync.get(defaultInterfaceSettings, function(items) {
		switchInterface(items.interface)
	})

	browser.storage.onChanged.addListener(function(changes) {
		if (changes.hasOwnProperty('interface')) {
			switchInterface(changes.interface.newValue)
		}
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
			sendToActiveContentScriptIfExists({ name: command })
			break
		default:
			throw Error(`Unknown command ${JSON.stringify(command)}`)
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
	browser.browserAction.setBadgeText({
		text: '',
		tabId: details.tabId
	})
})

browser.webNavigation.onCompleted.addListener(function(details) {
	if (details.frameId > 0) return
	checkBrowserActionState(details.tabId, details.url)
})

function checkBrowserActionState(tabId, url) {
	if (isContentScriptablePage(url)) {
		browser.browserAction.enable(tabId)
	} else {
		browser.browserAction.disable(tabId)

		// We may've moved from a page that allowed content scripts to one that
		// does not. If the sidebar/DevTools are open, they need to be updated.
		sendNullLandmarksToActiveTabGUIs()
	}
}

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
// TODO: In some circumstances (most GitHub transitions, this fires two times on
//       Firefox and three times on Chrome. For YouTube, some transitions only
//       cause this to fire once. Need to investigate this more...
browser.webNavigation.onHistoryStateUpdated.addListener(function(details) {
	if (details.frameId > 0) return
	if (contentConnections.hasOwnProperty(activeTabId)) {  // could be special page
		contentConnections[activeTabId].postMessage({ name: 'trigger-refresh' })
	}
})

browser.tabs.onActivated.addListener(function(activeInfo) {
	activeTabId = activeInfo.tabId

	const get = popupConnection
		|| ((BROWSER === 'firefox' ||
			BROWSER === 'opera')
			&& sidebarConnection)
		|| ((BROWSER === 'firefox' ||
			BROWSER === 'chrome' ||
			BROWSER === 'opera')
			&& devtoolsConnections.hasOwnProperty(activeTabId))

	if (get) getLandmarksForActiveTab()
})


//
// Install and update
//

browser.runtime.onInstalled.addListener(function(details) {
	if (details.reason === 'install' || details.reason === 'update') {
		browser.tabs.create({ url: `help.html#!${details.reason}` })
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
	contentScriptInjector()
}

if (BROWSER === 'firefox') {
	// Firefox loads content scripts into existing tabs before the background
	// script. That means they'll start before we've run, and fail to connect
	// here. Therefore we need to send a message to the content scripts to tell
	// them we're here and listening now.
	// Thanks https://bugzilla.mozilla.org/show_bug.cgi?id=1474727#c3
	browser.tabs.query({}, function(tabs) {
		for (const i in tabs) {
			const tabId = tabs[i].id
			const url = tabs[i].url

			if (isContentScriptablePage(url)) {
				// The page is a page on which Landmarks runs. Let the content
				// script know that the background page has started up.
				logger.log(`Sending connection request to tab ${tabId}`)
				browser.tabs.sendMessage(tabId, { name: 'FirefoxWorkaround' })
			}
		}
	})
}
