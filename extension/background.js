chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	landmarksLog(tabs[0].id, "background.js run");
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (!changeInfo.url) {
		return;
	}
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		if (tabId == tabs[0].id) {
			landmarksLog(tabId, "user navigated within a tab");
		}
	});
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
	landmarksLog(activeInfo.tabId, "new tab became active");
});

function landmarksLog(tabId, message) {
	console.log(tabId, message);
}

// requires Firefox 48 (or Developer Edition)
chrome.commands.onCommand.addListener(function(command) {
	if (command == 'next-landmark') {
		console.log('next!');
	} else if (command == 'prev-landmark') {
		console.log('prev!');
	}
});
