

//
// Install and Update
//

// This hook is used to show the web page for the extension and, more
// importantly for Chrome users, to inject the script manually on install
// (Firefox does this automatically).
//
// The onInstalled event is only supported in Chrome at the moment.
//
// Firefox bug, for info: https://bugzilla.mozilla.org/show_bug.cgi?id=1252871

chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason === 'install' || details.reason === 'update') {
		// Show website and get it to display an appropriate notice
		let base_url = 'http://matatk.agrip.org.uk/landmarks/#!';
		chrome.tabs.create({
			url: base_url + details.reason
		});

		// Inject content script manually
		chrome.tabs.query({}, function(tabs) {
			for(var i in tabs) {
				chrome.tabs.executeScript(tabs[i].id, {file: "content.js"});
			}
		});
	}
});
