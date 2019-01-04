import './compatibility'
import { defaultSettings, dismissalStates } from './defaults'

const options = [{
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

	document.getElementById('reset-all').onclick = resetAll
}

function interfaceExplainer() {
	const messageName = document.getElementById('landmarks-interface')
		.selectedOptions[0].dataset.explainer
	document.getElementById('interface-explainer')
		.innerText = browser.i18n.getMessage(messageName)
	setTimeout(function() {
		document.getElementById('interface-explainer-live')
			.innerText = browser.i18n.getMessage(messageName)
	}, 250)
}

function updateResetDismissedMessagesButtonState() {
	const button = document.getElementById('reset-messages')
	const feedback = document.getElementById('reset-messages-feedback')

	browser.storage.sync.get(dismissalStates, function(items) {
		for (const dismissalState in items) {
			if (items[dismissalState] === true) {
				button.setAttribute('aria-disabled', false)
				feedback.innerText = null
				return
			}
		}

		button.setAttribute('aria-disabled', true)
		if (!feedback.innerText) {
			feedback.innerText =
				browser.i18n.getMessage('prefsResetMessagesNone')
		}
	})
}

function resetMessages() {
	if (this.getAttribute('aria-disabled') === String(false)) {
		browser.storage.sync.set(dismissalStates)  // default values are false
		document.getElementById('reset-messages-feedback')
			.innerText = browser.i18n.getMessage('prefsResetMessagesDone')
	}
}

function dismissalStateChanged(thingChanged) {
	return dismissalStates.hasOwnProperty(thingChanged)
}

function resetAll() {
	browser.storage.sync.clear()
	window.location.reload()
}

function main() {
	if (BROWSER === 'firefox' || BROWSER === 'opera') {
		options.push({
			name: 'interface',
			element: document.getElementById('landmarks-interface'),
			property: 'value',
			change: interfaceExplainer
		})

		updateResetDismissedMessagesButtonState()

		browser.storage.onChanged.addListener(function(changes) {
			if (Object.keys(changes).some(dismissalStateChanged)) {
				updateResetDismissedMessagesButtonState()
			}
		})
	}

	translateStuff()
	restoreOptions()
	setUpOptionHandlers()
}

main()
