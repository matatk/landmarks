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
	kind: 'radio'
}, {
	name: 'borderColour',
	kind: 'individual',
	element: document.getElementById('border-colour'),
}, {
	name: 'borderFontSize',
	kind: 'individual',
	element: document.getElementById('border-font-size'),
}]

function restoreOptions() {
	browser.storage.sync.get(defaultSettings, function(items) {
		for (const option of options) {
			const name = option.name
			const saved = items[name]

			switch (option.kind) {
				case 'radio':
					document.getElementById(`radio-${saved}`).checked = true
					break
				case 'individual':
					option.element.value = saved
					break
				default:
					console.error(`Unexpected option kind '${option.kind}'`)
			}
		}
	})
}

function setUpOptionHandlers() {
	for (const option of options) {
		if (option.kind === 'individual') {
			option.element.addEventListener('change', () => {
				browser.storage.sync.set({
					[option.name]: option.element.value
				})
			})
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

	if (BROWSER === 'firefox' || BROWSER === 'opera') {
		document.getElementById('reset-messages').onclick = resetMessages
	}

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
	browser.storage.sync.set(defaultSettings, function() {
		window.location.reload()
	})
	// Note: Can't use use .clear() as that removes everything, which would
	//       cause problems for currently-visible borders.
	// FIXME use restoreOptions instead?
	// FIXME resetting to defaults after seetting to sidebar still brings up the warning message (even though it's going back to toolbar) -- this is because it reloads and persists the selection across reloads
}


//
// Entryway
//

function main() {
	if (BROWSER === 'firefox' || BROWSER === 'opera') {
		options.push({
			name: 'interface',
			kind: 'radio'
		})

		updateResetDismissedMessagesButtonState()

		browser.storage.onChanged.addListener(function(changes) {
			if (Object.keys(changes).some(dismissalStateChanged)) {
				updateResetDismissedMessagesButtonState()
			}
		})
	}

	translate()
	restoreOptions()
	setUpOptionHandlers()
}

main()
