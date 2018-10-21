import './compatibility'
import { defaultSettings, dismissalStates } from './defaults'

const options = [{
	name: 'interface',
	element: document.getElementById('landmarks-interface'),
	property: 'value',
	change: interfaceExplainer
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
function translateStuff() {
	const objects = document.getElementsByTagName('*')
	for(const object of objects) {
		if (object.dataset && object.dataset.message) {
			object.innerText = browser.i18n.getMessage(object.dataset.message)
		}
	}
}

function restoreOptions() {
	browser.storage.sync.get(defaultSettings, function(items) {
		for (const option of options) {
			if (option.element) {  // Sidebar option will be null on Chrome
				option.element[option.property] = items[option.name]

				// Some options result in changes to the options UI
				if (option.change) {
					option.change()
				}
			}
		}
	})
}

function setUpOptionHandlers() {
	for (const option of options) {
		if (option.element) {  // Sidebar option will be null on Chrome
			option.element.addEventListener('change', () => {
				browser.storage.sync.set({
					[option.name]: option.element[option.property]
				})
			})

			// Some options result in changes to the options UI
			if (option.change) {
				option.element.addEventListener('change', option.change)
			}
		}
	}

	if (BROWSER === 'firefox' || BROWSER === 'opera') {
		document.getElementById('reset-messages').onclick = resetMessages
	}
}

// TODO check this doesn't appear on Chrome
function interfaceExplainer() {
	const messageName = document
		.getElementById('landmarks-interface')
		.selectedOptions[0].dataset.explainer
	const explainer = document.getElementById('interface-explainer')
	explainer.innerText = browser.i18n.getMessage(messageName)
}

// TODO check this doesn't appear on Chrome
function resetMessages() {
	for (const dismissalState in dismissalStates) {
		browser.storage.sync.set({
			[dismissalState]: false
		}, function() {
			alert(browser.i18n.getMessage('prefsResetMessagesDone'))
		})
	}
}

translateStuff()
restoreOptions()
setUpOptionHandlers()
