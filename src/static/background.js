'use strict'
/* global sendToActiveTab landmarksContentScriptInjector specialPages */

//
// Keyboard Shortcut Handling
//

browser.commands.onCommand.addListener(function(command) {
	if (command === 'next-landmark') {
		sendToActiveTab({request: 'next-landmark'})
	} else if (command === 'prev-landmark') {
		sendToActiveTab({request: 'prev-landmark'})
	}
})


//
// Navigation Events
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
				console.log(`Landmarks: disabling extension on ${url}`)
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
			{request: 'trigger-refresh'}
		)
		// Note: The content script on the page will respond by sending
		//       an 'update-badge' request back (if landmarks are found).
	})
})


//
// Browser action badge updating
//

// When the content script has loaded and any landmarks found, it will let us
// konw, so we can set the browser action badge.
browser.runtime.onMessage.addListener(function(message, sender) {
	switch (message.request) {
		case 'update-badge':
			landmarksBadgeUpdate(sender.tab.id, message.landmarks)
			break
		default:
			throw('Landmarks: background script received unknown message:',
				message, 'from', sender)
	}
})

// Given a tab ID and number, set the browser action badge
function landmarksBadgeUpdate(tabId, numberOfLandmarks) {
	let badgeText

	if (numberOfLandmarks < 0) {
		badgeText = '...'
	} else if (numberOfLandmarks === 0) {
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
// Install and Update
//

browser.runtime.onInstalled.addListener(function(details) {
	if (details.reason === 'install' || details.reason === 'update') {
		// Don't inject the content script on Firefox
		if (typeof landmarksContentScriptInjector !== 'undefined') {
			landmarksContentScriptInjector()
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
