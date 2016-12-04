const borderTypeId = 'border-type'

function saveOptions() {
	setWrapper({
		border_type: document.getElementById(borderTypeId).value
	})
}

function restoreOptions() {
	getWrapper({
		border_type: 'momentary',  // default value
	}, function(items) {
		document.getElementById(borderTypeId).value = items.border_type
	})
}

// Wrappers to support Firefox (which doesn't have storage.sync)
// and handle the status update.
// TODO: DRY also in content script
function getWrapper(options, action) {
	const area = chrome.storage.sync || chrome.storage.local
	area.get(options, action)
}

function setWrapper(options) {
	const area = chrome.storage.sync || chrome.storage.local
	area.set(options, function() {
		const statusRegion = document.getElementById('status')
		statusRegion.textContent = chrome.i18n.getMessage('prefsSaved')
		setTimeout(function() {
			statusRegion.textContent = ''
		}, 750)
	})
}

// Translation
// Based on http://tumble.jeremyhubert.com/post/7076881720/translating-html-in-a-chrome-extension - HT http://stackoverflow.com/questions/25467009/
// TODO probably will need DRYing in future
// TODO would be nice to use the doForEach wrpper on this
function translateStuff() {
	const objects = document.getElementsByTagName('*')
	for(let i = 0; i < objects.length; i++) {
		if (objects[i].dataset && objects[i].dataset.message) {
			objects[i].innerText =
				chrome.i18n.getMessage(objects[i].dataset.message)
		}
	}
}

document.addEventListener('DOMContentLoaded', translateStuff)
document.addEventListener('DOMContentLoaded', restoreOptions)
document.getElementById('save').addEventListener('click', saveOptions)
