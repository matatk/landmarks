import './compatibility'
import contentScriptInjector from './contentScriptInjector'
import specialPages from './specialPages'
import { defaultInterfaceSettings } from './defaults'
import disconnectingPortErrorCheck from './disconnectingPortErrorCheck'

const contentConnections = {}
const devtoolsConnections = {}
let sidebarConnection = null
let popupConnection = null
let activeTabId = null


//
// Message routing
//

function sendLandmarksToGUIs(fromTabId, message) {
	if (popupConnection) popupConnection.postMessage(message)
	if (sidebarConnection && fromTabId === activeTabId) {
		sidebarConnection.postMessage(message)
	}
	if (devtoolsConnections.hasOwnProperty(fromTabId)) {
		devtoolsConnections[fromTabId].postMessage(message)
	}
}

function getLandmarksForActiveTab() {
	if (contentConnections.hasOwnProperty(activeTabId)) {
		contentConnections[activeTabId].postMessage({ name: 'get-landmarks' } )
	} else {
		sendLandmarksToGUIs(activeTabId, { name: 'landmarks', data: `not connected to ${activeTabId}` })
	}
}

function sendToActiveContentScriptIfExists(message) {
	if (contentConnections.hasOwnProperty(activeTabId)) {
		contentConnections[activeTabId].postMessage(message)
	} else {
		console.log(`No content script connected in tab ${activeTabId}`)
	}
}

function updateBrowserActionBadge(tabId, numberOfLandmarks) {
	let badgeText

	if (numberOfLandmarks <= 0) {
		badgeText = ''
	} else {
		badgeText = String(numberOfLandmarks)
	}

	browser.browserAction.setBadgeText({
		text: badgeText,
		tabId: tabId
	})
}


//
// Setting up and handling connections
//

browser.runtime.onConnect.addListener(function(connectingPort) {
	// Disconnection management

	function contentDisconnect(disconnectingPort) {
		console.log(`Content script for tab ${disconnectingPort.sender.tab.id} disconnected`)
		disconnectingPortErrorCheck(disconnectingPort)
		delete contentConnections[disconnectingPort.sender.tab.id]
		console.log(`${Object.keys(contentConnections).length} content connections`)
	}

	function devtoolsDisconnect(tabId) {
		console.log(`DevTools script for tab ${tabId} disconnected`)
		delete devtoolsConnections[tabId]
		console.log(`${Object.keys(devtoolsConnections).length} devtools connections`)
	}


	// Message listeners

	function contentListener(message, sendingPort) {
		const tabId = sendingPort.sender.tab.id

		console.log(`Content in ${tabId} ${sendingPort.sender.tab.url} sent ${message.name}`)

		switch (message.name) {
			case 'landmarks':
				sendLandmarksToGUIs(tabId, message)
				updateBrowserActionBadge(tabId, message.data.length)
				break
			default:
				throw Error(`Unknown message ${JSON.stringify(message)} from content script in ${sendingPort.sender.tab.id}`)
		}
	}

	function popupAndSidebarListener(message) {  // also gets: sendingPort
		switch (message.name) {
			case 'get-landmarks':
				getLandmarksForActiveTab()
				break
			case 'focus-landmark':
				sendToActiveContentScriptIfExists(message)
				break
			default:
				throw Error(`Unknown message ${JSON.stringify(message)} from sidebar or popup`)
		}
	}

	function devtoolsListner(message) {
		switch (message.name) {
			case 'init':
				devtoolsConnections[message.tabId] = connectingPort
				console.log(`${Object.keys(devtoolsConnections).length} devtools connections`)
				connectingPort.onDisconnect.addListener(function(disconnectingPort) {
					disconnectingPortErrorCheck(disconnectingPort)
					devtoolsDisconnect(message.tabId)
				})
				break
			case 'get-landmarks':
				getLandmarksForActiveTab()
				break
			case 'focus-landmark':
				sendToActiveContentScriptIfExists(message)
				break
			default:
				throw Error(`Unkown message from devtools: ${JSON.stringify(message)}`)
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
				// This should only appear on Chrome/Opera
				browser.tabs.create({
					url: BROWSER === 'chrome' ? 'chrome://extensions/configureCommands' : 'opera://settings/configureCommands'
				})
				break
			default:
				throw Error(`Unkown message from devtools: ${JSON.stringify(message)}`)
		}
	}


	// Connection management

	switch (connectingPort.name) {
		case 'content':
			contentConnections[connectingPort.sender.tab.id] = connectingPort
			console.log(`${connectingPort.sender.tab.id} ${connectingPort.sender.tab.url} content script connected`)
			console.log(`${Object.keys(contentConnections).length} content connections`)
			connectingPort.onMessage.addListener(contentListener)
			connectingPort.onDisconnect.addListener(contentDisconnect)
			break
		case 'devtools':
			connectingPort.onMessage.addListener(devtoolsListner)
			break
		case 'popup':
			if (popupConnection !== null) {
				throw Error('Existing pop-up connection')
			}
			popupConnection = connectingPort
			console.log('Pop-up connected')
			connectingPort.onMessage.addListener(popupAndSidebarListener)
			connectingPort.onDisconnect.addListener(function() {
				console.log('Pop-up disconnected')
				popupConnection = null
			})
			break
		case 'sidebar':
			if (sidebarConnection !== null) {
				throw Error('Existing sidebar connection')
			}
			sidebarConnection = connectingPort
			console.log('Sidebar connected')
			connectingPort.onMessage.addListener(popupAndSidebarListener)
			connectingPort.onDisconnect.addListener(function() {
				console.log('Sidebar disconnected')
				sidebarConnection = null
			})
			break
		case 'splash':
			console.log('Splash connected')
			connectingPort.onMessage.addListener(splashListener)
			connectingPort.onDisconnect.addListener(function() {
				console.log('Splash disconnected')
			})
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
		case 'show-all-landmarks':
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
	if (/^(https?|file):\/\//.test(url)) {  // TODO DRY
		for (const specialPage of specialPages) {  // TODO DRY
			if (specialPage.test(url)) {
				browser.browserAction.disable(tabId)
				return
			}
		}
		browser.browserAction.enable(tabId)
	} else {
		browser.browserAction.disable(tabId)
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
	console.log(`Active tab is ${activeTabId}`)
	if (popupConnection) {
		getLandmarksForActiveTab()
	}
	if (BROWSER === 'firefox' || BROWSER === 'opera') {
		if (sidebarConnection) {
			getLandmarksForActiveTab()
		}
	}
})


//
// Install and update
//

browser.runtime.onInstalled.addListener(function(details) {
	if (details.reason === 'install' || details.reason === 'update') {
		// Show website and get it to display an appropriate notice
		const baseUrl = 'http://matatk.agrip.org.uk/landmarks/#!'
		browser.tabs.create({
			url: baseUrl + details.reason
		})
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

// Don't inject the content script on Firefox
if (BROWSER !== 'firefox') {
	contentScriptInjector()
}
