export default function sendToActiveTab(message, callback) {
	browser.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		browser.tabs.sendMessage(tabs[0].id, message, callback)
	})
}
