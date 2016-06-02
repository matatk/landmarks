// If the landmark has a label, the name is: 'label (role)'
// otherwise the name is just 'role'
function landmarkName(landmark) {
	if (landmark.label) {
		return landmark.label + " (" + landmark.role + ")";
	} else {
		return landmark.role;
	}
}

// Create the HTML code (string) for a button for a given page landmark
function buttonForElement(landmark, index) {
	var html = '<button>';
	html += landmarkName(landmark);
	html += '</button>';
	return html;
}

// Go through the landmarks identified for the page and create an HTML
// nested list to mirror the structure of those landmarks
function receiveLandmarks(response) {
	console.log('receiveLandmarks', response);
	var html = '<ul>';
	var previous_depth = 0;

	response.forEach(function(landmark, index) {
		var depth_change = landmark.depth - previous_depth;

		if (depth_change > 0) {
			html += '<ul>';
		}

		if (depth_change < 0) {
			html += '</ul>';
		}

		html += '<li>';
		html += buttonForElement(landmark, index);
		html += '</li>';

		previous_depth = landmark.depth;
	});

	html += '</ul>';
	document.getElementById('landmarks').innerHTML = html;

	// Now wire up the button event handlers...
	var buttons = document.getElementsByTagName('button');
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener('click', clickHandler(i));
	}
}

// Function to make a click handler to focus a given landmark
// This is needed to avoid the JSHint warning about making functions in a loop
function clickHandler(index) {
	return function() {
		focusLandmark(index);
	};
}

// When a landmark's corresponding button in the UI is clicked, focus it
function focusLandmark(index) {
	sendToActiveTab({
		'request': 'focus-landmark',
		'index': index
	});
}

// Work out the current tab with a query, then send a message to it
// FIXME is there a more elegant way of doing this?
function sendToActiveTab(message, callback) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, message, callback);
	});
}

// When the pop-up opens, grab and process the list of page landmarks
document.addEventListener('DOMContentLoaded', function() {
	sendToActiveTab({'request': 'get-landmarks'}, receiveLandmarks);
});
