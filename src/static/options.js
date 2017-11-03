'use strict'
const borderTypeId = 'border-type'

function saveOptions() {
	setWrapper({
		borderType: document.getElementById(borderTypeId).value
	})
}

function restoreOptions() {
	browser.storage.sync.get({
		borderType: 'momentary',  // default value
	}, function(items) {
		document.getElementById(borderTypeId).value = items.borderType
	})
}

// Wrapper to simplify saving settings, and handle the status update.
function setWrapper(options) {
	const area = browser.storage.sync || browser.storage.local
	area.set(options, function() {
		const statusRegion = document.getElementById('status')
		statusRegion.textContent = browser.i18n.getMessage('prefsSaved')
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
				browser.i18n.getMessage(objects[i].dataset.message)
		}
	}
}

document.addEventListener('DOMContentLoaded', translateStuff)
document.addEventListener('DOMContentLoaded', restoreOptions)
document.getElementById('save').addEventListener('click', saveOptions)
