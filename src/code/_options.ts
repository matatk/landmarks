// hasOwnProperty is only used on browser-provided objects
/* eslint-disable no-prototype-builtins */
import './compatibility'
import translate from './translate'
import { defaultSettings, defaultDismissalStates } from './defaults'


//
// Options
//

const options = [{
	name: 'borderType',
	kind: 'choice'
}, {
	name: 'borderColour',
	kind: 'individual',
	element: document.getElementById('border-colour')
}, {
	name: 'borderFontSize',
	kind: 'individual',
	element: document.getElementById('border-font-size')
}, {
	name: 'guessLandmarks',
	kind: 'boolean',
	element: document.getElementById('guess-landmarks')
}, {
	name: 'closePopupOnActivate',
	kind: 'boolean',
	element: document.getElementById('close-popup-on-activate')
}, {
	name: 'handleMutationsViaTree',
	kind: 'boolean',
	element: document.getElementById('handle-mutations-via-tree')
}]

function restoreOptions() {
	browser.storage.sync.get(defaultSettings, function(items) {
		for (const option of options) {
			const name = option.name
			const saved = items[name]

			switch (option.kind) {
				case 'choice':
					document.getElementById(`radio-${saved}`).checked = true
					break
				case 'individual':
					option.element.value = saved
					break
				case 'boolean':
					option.element.checked = saved
					break
				default:
					console.error(`Unexpected option kind '${option.kind}'`)
			}
		}
	})
}

function setUpOptionHandlers() {
	for (const option of options) {
		switch (option.kind) {
			case 'individual':
				option.element.addEventListener('change', () => {
					if (option.element.value) {
						browser.storage.sync.set({
							[option.name]: option.element.value
						})
					} else {
						option.element.value = defaultSettings[option.name]
					}
				})
				break
			case 'boolean':
				option.element.addEventListener('change', () => {
					browser.storage.sync.set({
						[option.name]: option.element.checked
					})
				})
				break
			default:
				// Choice (radio button) options are handled below.
		}
	}

	for (const radio of document.querySelectorAll('input[type="radio"]')) {
		radio.addEventListener('change', function() {
			const pref = this.parentElement.parentElement
				.getAttribute('data-pref')
			browser.storage.sync.set({
				[pref]: this.value
			})
		})
	}

	document.getElementById('reset-messages').onclick = resetMessages
	document.getElementById('reset-to-defaults').onclick = resetToDefaults
}

function updateResetDismissedMessagesButtonState() {
	const button = document.getElementById('reset-messages')
	const feedback = document.getElementById('reset-messages-feedback')

	browser.storage.sync.get(defaultDismissalStates, function(items) {
		for (const dismissalState in items) {
			if (items[dismissalState] === true) {
				button.dataset.someMessagesDismissed = true
				feedback.innerText = null
				return
			}
		}

		button.dataset.someMessagesDismissed = false
		if (!feedback.innerText) {
			feedback.innerText =
				browser.i18n.getMessage('prefsResetMessagesNone')
		}
	})
}

function resetMessages() {
	if (this.dataset.someMessagesDismissed === String(true)) {
		browser.storage.sync.set(defaultDismissalStates)
		document.getElementById('reset-messages-feedback')
			.innerText = browser.i18n.getMessage('prefsResetMessagesDone')
	}
}

function dismissalStateChanged(thingChanged) {
	return defaultDismissalStates.hasOwnProperty(thingChanged)
}

function resetToDefaults() {
	browser.storage.sync.clear()
	restoreOptions()
}


//
// Entryway
//

function main() {
	if (BROWSER === 'firefox' || BROWSER === 'opera') {
		options.push({
			name: 'interface',
			kind: 'choice'
		})
	}

	updateResetDismissedMessagesButtonState()

	browser.storage.onChanged.addListener(function(changes) {
		if (Object.keys(changes).some(dismissalStateChanged)) {
			updateResetDismissedMessagesButtonState()
		}
	})

	translate()
	restoreOptions()
	setUpOptionHandlers()
}

main()
