// Command support requires Chrome, or Firefox 48 or Developer Edition
chrome.commands.onCommand.addListener(function(command) {
	if (command === 'next-landmark') {
		sendToActiveTab({'request': 'next-landmark'});
	} else if (command === 'prev-landmark') {
		sendToActiveTab({'request': 'prev-landmark'});
	}
});

// Work out the current tab with a query, then send a message to it
// Pattern from: https://developer.chrome.com/extensions/messaging
// TODO: DRY (repeated in popup script)
function sendToActiveTab(message, callback) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, message, callback);
	});
}

// The landmarks on the page are queried when the pop-up is first activated
// by the user. However, if the page uses 'single-page app' techniques to
// load in new components -- as YouTube and GitHub do -- then the landmarks
// can change. Therefore we need to monitor for the History API having been
// used to update the URL of the page without there having been a full reload.
// To handle youtube video page
//
// Thanks: http://stackoverflow.com/a/36818991/1485308
//
// Note: The original code had a fliter such that this would only fire if the
//       URLs of the current tab and the details object matched. This seems to
//       work very well on most pages, but I noticed at least one case where it
//       did not (moving to a repo's Graphs page on GitHub). Seeing as this
//       only sends a short message to the content script, I've removed the
//       'same URL' filtering.
chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
	if (details.frameId === 0) {
		chrome.tabs.get(details.tabId, function(tab) {
			chrome.tabs.sendMessage(
				details.tabId, {'request': 'trigger-refresh'}
			);
		});
	}
});

// Listen for URL change events on the tab and disable the browser action if
// the URL does not start with 'http://' or 'https://'
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if (!changeInfo.url) {
		return;
	}
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		if (tabId == tabs[0].id) {
			checkBrowserActionState(tabId, changeInfo.url);
		}
	});
});

function checkBrowserActionState(tabId, url) {
	if (startsWith(url, 'http://') || startsWith(url, 'https://')) {
		chrome.browserAction.enable(tabId);
	} else {
		chrome.browserAction.disable(tabId);
	}
}

function startsWith(string, pattern) {
	return string.substring(0, pattern.length) == pattern;
}
