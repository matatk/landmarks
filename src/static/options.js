function saveOptions() {
	var border_type = document.getElementById('border_type').value;
	setWrapper({
		border_type: border_type
	});
}

function restoreOptions() {
	getWrapper({
		border_type: '',
	}, function(items) {
		document.getElementById('border_type').value = items.border_type;
	});
}

// Wrappers to support Firefox (which doesn't have storage.sync)
// and handle the status update.
function getWrapper(options, action) {
	var area = chrome.storage.sync || chrome.storage.local;
	area.get(options, action);
}

function setWrapper(options) {
	var area = chrome.storage.sync || chrome.storage.local;
	area.set(options, function() {
		var statusRegion = document.getElementById('status');
		statusRegion.textContent = 'Options saved.';
		setTimeout(function() {
			statusRegion.textContent = '';
		}, 750);
	});
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
