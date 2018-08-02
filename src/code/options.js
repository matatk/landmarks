import { defaultSettings } from './defaults.js'

const options = [{
	name: 'interface',
	element: document.getElementById('landmarks-interface'),
	property: 'value'
},{
	name: 'borderType',
	element: document.getElementById('border-type'),
	property: 'value'
}, {
	name: 'borderColour',
	element: document.getElementById('border-colour'),
	property: 'value'
}, {
	name: 'borderFontSize',
	element: document.getElementById('border-font-size'),
	property: 'value'
}, {
	name: 'debugInfo',
	element: document.getElementById('debug-info'),
	property: 'checked'
}]

// Translation
// http://tumble.jeremyhubert.com/post/7076881720
// HT http://stackoverflow.com/questions/25467009/
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

function restoreOptions() {
	browser.storage.sync.get(defaultSettings, function(items) {
		for (const option of options) {
			option.element[option.property] = items[option.name]
		}
	})
}

function setUpOptionHandlers() {
	for (const option of options) {
		option.element.addEventListener('change', () => {
			console.log('Setting:', {
				[option.name]: option.element[option.property]})
			browser.storage.sync.set({
				[option.name]: option.element[option.property]
			})
		})
	}
}

document.addEventListener('DOMContentLoaded', translateStuff)
document.addEventListener('DOMContentLoaded', restoreOptions)
document.addEventListener('DOMContentLoaded', setUpOptionHandlers)
