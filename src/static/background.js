// This requires Chrome, or Firefox 48 or Developer Edition
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
