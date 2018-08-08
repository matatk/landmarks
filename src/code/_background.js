import './compatibility'
import sendToActiveTab from './sendToActiveTab'
import contentScriptInjector from './contentScriptInjector'
import specialPages from './specialPages'
import { defaultInterfaceSettings } from './defaults'


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

	// When the user moves between tabs, the sidebar needs updating. This
	// message will be sent even when the primary interface is set to the
	// pop-up, because we've no way to know if the sidebar is open or not; if
	// it's open it should update. If it is open, but the primary interface is
	// the pop-up, a note will be inserted (by the popup code) to alert the
	// user to the potential misconfiguration.
	browser.tabs.onActivated.addListener(function() {
		browser.runtime.sendMessage({
			request: 'update-sidebar'
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
		case 'show-all-landmarks':
			sendToActiveTab({ request: command })
			break
	}
})


//
// Navigation events
//

// Listen for URL change events on all tabs and disable the browser action if
// the URL does not start with 'http://' or 'https://' (or 'file://', for
// local pages).
//
// Notes:
//  * This used to be wrapped in a query for the active tab, but on browser
//    startup, URL changes are going on in all tabs.
//  * The content script will send an 'update-badge' message back to us when
//    the landmarks have been found.
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
		for (const specialPage of specialPages) {
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
//       Firefox and three times on Chrome.  For YouTube, some transitions only
//       cause this to fire once. Need to investigate this more...
browser.webNavigation.onHistoryStateUpdated.addListener(function(details) {
	if (details.frameId > 0) return
	browser.tabs.get(details.tabId, function() {
		browser.tabs.sendMessage(
			details.tabId,
			{ request: 'trigger-refresh' }
		)
		// Note: The content script on the page will respond by sending
		//       an 'update-badge' request back (if landmarks are found).
	})
})


//
// Browser action badge updating; Command enumeration
//

// When the content script has loaded and any landmarks found, it will let us
// konw, so we can set the browser action badge.
browser.runtime.onMessage.addListener(function(message, sender) {
	switch (message.request) {
		case 'update-badge':
			landmarksBadgeUpdate(sender.tab.id, message.landmarks)
			break
		case 'get-commands':
			browser.commands.getAll(function(commands) {
				sendToActiveTab({
					request: 'splash-populate-commands',
					commands: commands
				})
			})
			break
		case 'splash-open-configure-shortcuts':
			// FIXME TODO disable for !Chrome
			browser.tabs.create({
				url: 'chrome://extensions/configureCommands'
			})
			// FIXME TODO Opera: opera://settings/configureCommands
			// https://github.com/openstyles/stylus/issues/52#issuecomment-302409069
			break
		default:
			throw Error(
				'Landmarks: background script received unexpected request '
				+ message.request + ' from tab ' + sender.tab.id)
	}
})

// Given a tab ID and number, set the browser action badge
function landmarksBadgeUpdate(tabId, numberOfLandmarks) {
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
// Install and update
//

browser.runtime.onInstalled.addListener(function(details) {
	if (details.reason === 'install' || details.reason === 'update') {
		// Don't inject the content script on Firefox
		if (BROWSER !== 'firefox') {
			contentScriptInjector()
		}

		// Show website and get it to display an appropriate notice
		const baseUrl = 'http://matatk.agrip.org.uk/landmarks/#!'
		browser.tabs.create({
			url: baseUrl + details.reason
		})
	}
})


//
// Guard against browser action being errantly enabled
//

// When the extension is loaded, if it's loaded into a page that is not an
// HTTP(S) page, then we need to disable the browser action button.  This is
// not done by default on Chrome or Firefox.
browser.tabs.query({}, function(tabs) {
	for (const i in tabs) {
		checkBrowserActionState(tabs[i].id, tabs[i].url)
	}
})
