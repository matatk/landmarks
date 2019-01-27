import './compatibility'
import contentScriptInjector from './contentScriptInjector'
import isContentScriptablePage from './isContentScriptablePage'
import { defaultInterfaceSettings } from './defaults'
import disconnectingPortErrorCheck from './disconnectingPortErrorCheck'
import Logger from './logger'
import sendToActiveTab from './sendToActiveTab'

const logger = new Logger(window)
const devtoolsConnections = {}


//
// Message routing - TODO re-organise sections
//

// FIXME needs work!
function sendNullLandmarksToActiveTabGUIs() {
	sendToActiveTab({ name: 'landmarks', data: null })
}

function updateBrowserActionBadge(tabId, numberOfLandmarks) {
	browser.browserAction.setBadgeText({
		text: numberOfLandmarks <= 0 ? '' : String(numberOfLandmarks),
		tabId: tabId
	})
}


//
// Setting up and handling DevTools connections
//

function devtoolsDisconnect(tabId) {
	logger.log(`DevTools page for tab ${tabId} disconnected`)
	delete devtoolsConnections[tabId]
}

function devtoolsListenerMaker(connectingPort) {
	// DevTools connections come from the DevTools panel, but the panel is
	// inspecting a particular web page, which has a different tab ID.
	return function(message) {
		switch (message.name) {
			case 'init':
				logger.log(`DevTools page for tab ${message.tabId} connected`)
				devtoolsConnections[message.tabId] = connectingPort
				connectingPort.onDisconnect.addListener(disconnectingPort => {
					disconnectingPortErrorCheck(disconnectingPort)
					devtoolsDisconnect(message.tabId)
				})
				break
			case 'get-landmarks':
			case 'focus-landmark':
			case 'get-toggle-state':
			case 'toggle-all-landmarks':
				sendToActiveTab(message)
				break
			default:
				throw Error(`Unexpected message from DevTools: ${JSON.stringify(message)}`)
		}
	}
}

browser.runtime.onConnect.addListener(function(connectingPort) {
	switch (connectingPort.name) {
		case 'devtools':
			if (BROWSER === 'firefox' || BROWSER === 'chrome' || BROWSER === 'opera') {
				connectingPort.onMessage.addListener(
					devtoolsListenerMaker(connectingPort))
			}
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
	// TODO: Check for when these may be fixed upstream.
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
		case 'toggle-all-landmarks':
			sendToActiveTab({ name: command })
			break
		default:
			throw Error(`Unexpected command ${JSON.stringify(command)}`)
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
// TODO: In some circumstances (most GitHub transitions, this fires two times
//       on Firefox and three times on Chrome. For YouTube, some transitions
//       only cause this to fire once. Could it be to do with
//       <https://developer.chrome.com/extensions/background_pages#filters>?
browser.webNavigation.onHistoryStateUpdated.addListener(function(details) {
	if (details.frameId > 0) return
	sendToActiveTab({ name: 'trigger-refresh' })
})

browser.tabs.onActivated.addListener(function() {  // activeTabInfo
	sendToActiveTab({ name: 'get-landmarks' } )
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

if (BROWSER === 'chrome' || BROWSER === 'opera' || BROWSER === 'edge') {
	contentScriptInjector()
}


//
// Message handling
//

function sendToDevToolsIfActive(message) {
	browser.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		const activeTabId = tabs[0].id
		if (devtoolsConnections.hasOwnProperty(activeTabId)) {
			devtoolsConnections[activeTabId].postMessage(message)
		}
	})
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	// TODO DRY with content
	const tabId = sender.tab
		? sender.tab.id
		: sender.url
			? sender.url.slice(sender.url.lastIndexOf('/') + 1)
			: '<unknown>'

	switch (message.name) {
		// Content
		case 'landmarks':
			updateBrowserActionBadge(tabId, message.data.length)
			sendToDevToolsIfActive(message)
			break
		// Splash
		case 'get-commands':
			browser.commands.getAll(function(commands) {
				sendResponse({
					name: 'populate-commands',
					commands: commands
				})
			})
			break
		case 'open-configure-shortcuts':
			browser.tabs.update({
				// This should only appear on Chrome/Opera
				url: BROWSER === 'chrome'
					? 'chrome://extensions/configureCommands'
					: 'opera://settings/keyboardShortcuts'
			})
			break
		case 'open-help':
			browser.tabs.update({
				url: browser.runtime.getURL('help.html')
			})
			break
		case 'open-settings':
			browser.runtime.openOptionsPage()
			break
		// Messages DevTools panel needs to know
		case 'toggle-state':
			sendToDevToolsIfActive(message)
			break
		// Messages we don't handle here
		case 'toggle-all-landmarks':
			break
		default:
			throw Error(`Unexpected message ${JSON.stringify(message)} from ${tabId}`)
	}
})
