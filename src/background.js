chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	makeLandmarks(tabs[0].id, "background.js run");
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (!changeInfo.url) {
		return;
	}
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		if (tabId == tabs[0].id) {
			makeLandmarks(tabId, "user navigated within a tab");
		}
	});
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
	makeLandmarks(activeInfo.tabId, "new tab became active");
});

chrome.browserAction.onClicked.addListener(function (tab) {
	console.log("landmarks browserAction clicked; tab", tab.id)
});

function makeLandmarks(tabId, message) {
	console.log(tabId, message);
}
