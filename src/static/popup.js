// Handle incoming landmarks message response
//
// If there are landmarks, then the response will be a list of objects that
// represent the landmarks.
//
//     [ { label: X, role: Y, depth: Z }, { . . . }, . . . ]
//
// If we got some landmarks from the page, make the tree of them.
//
// If not, put a message there stating such.
function handleLandmarksResponse(response) {
	console.log('Landmarks: popup: got:', response);
	// FIXME why is this sometimes getting undefined?
	var display = document.getElementById('landmarks');
	display.innerHTML = '';

	if (chrome.runtime.lastError) {
		display.innerHTML = '<p>Error: ' + chrome.runtime.lastError.message +
			'</p><p>The page may not have finished loading yet; please try ' +
			'again shortly.</p>';
		return;
	}

	if (Array.isArray(response)) {
		// Content script would normally send back an array
		if (response.length === 0) {
			display.innerHTML = '<p>No landmarks.</p>';
		} else {
			makeLandmarksTree(response, display);
		}
	} else if (response === 'wait') {
		display.innerHTML = '<p>The page has not yet been checked for ' +
			'landmarks; please try again.</p>';
	} else {
		display.innerHTML = '<p>Error: unexpected response from ' +
			'content script: ' + response + '</p>';
	}
}

// Go through the landmarks identified for the page and create an HTML
// nested list to mirror the structure of those landmarks
function makeLandmarksTree(landmarks, container) {
	var previous_depth = 0;
	var root = document.createElement('ul');  // start of tree
	var base = root;                          // anchor for sub-trees
	var previous_item = null;                 // last item to be created

	landmarks.forEach(function(landmark, index) {
		var depth_change = landmark.depth - previous_depth;

		// When nesting increases, attach a new <ul> to the last-created <li>
		if (depth_change > 0) {
			base = document.createElement('ul');
			previous_item.appendChild(base);
		}

		// When nesting decreases, attach new <li>s to the current base's parent
		if (depth_change < 0) {
			// the parent of base is an <li>, the grandparent is the <ul>
			base = base.parentElement.parentElement;
		}

		// If nesting hasn't changed, stick with the current base

		// Create the <li> for this landmark
		var item = document.createElement('li');
		var button = document.createElement('button');
		button.appendChild(document.createTextNode(landmarkName(landmark)));
		button.addEventListener('click', function() {
			focusLandmark(index);
		});
		item.appendChild(button);
		base.appendChild(item);  // add to current base

		// Housekeeping
		previous_depth = landmark.depth;
		previous_item = item;
	});

	container.appendChild(root);
}

// If the landmark has a label, the name is: 'label (role)'
// otherwise the name is just 'role'
function landmarkName(landmark) {
	if (landmark.label) {
		return landmark.label + ' (' + landmark.role + ')';
	} else {
		return landmark.role;
	}
}

// When a landmark's corresponding button in the UI is clicked, focus it
function focusLandmark(index) {
	sendToActiveTab({
		request: 'focus-landmark',
		index: index
	});
}

// Work out the current tab with a query, then send a message to it
// Pattern from: https://developer.chrome.com/extensions/messaging
// TODO: DRY (repeated in background script)
function sendToActiveTab(message, callback) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, message, callback);
	});
}

// When the pop-up opens, grab and process the list of page landmarks
document.addEventListener('DOMContentLoaded', function() {
	sendToActiveTab({request: 'get-landmarks'}, handleLandmarksResponse);
});
