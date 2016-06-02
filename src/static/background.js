// This requires Chrome, or Firefox 48 or Developer Edition
chrome.commands.onCommand.addListener(function(command) {
	if (command == 'next-landmark') {
		console.log('next!');
	} else if (command == 'prev-landmark') {
		console.log('prev!');
	}
});
