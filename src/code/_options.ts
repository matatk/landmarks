// hasOwnProperty is only used on browser-provided objects
/* eslint-disable no-prototype-builtins */
import './compatibility'
import translate from './translate.js'
import { defaultSettings, defaultDismissalStates } from './defaults.js'


//
// Options
//

type OptionBase = { name: keyof typeof defaultSettings }
type OptionElement = { element: HTMLInputElement }

type Option =
	{ kind: 'choice' } & OptionBase |
	{ kind: 'individual' } & OptionBase & OptionElement |
	{ kind: 'boolean' } & OptionBase & OptionElement

const options: Option[] = [{
	name: 'borderType',
	kind: 'choice'
}, {
	name: 'borderColour',
	kind: 'individual',
	// @ts-ignore FIXME
	element: document.getElementById('border-colour')
}, {
	name: 'borderFontSize',
	kind: 'individual',
	// @ts-ignore FIXME
	element: document.getElementById('border-font-size')
}, {
	name: 'guessLandmarks',
	kind: 'boolean',
	// @ts-ignore FIXME
	element: document.getElementById('guess-landmarks')
}, {
	name: 'closePopupOnActivate',
	kind: 'boolean',
	// @ts-ignore FIXME
	element: document.getElementById('close-popup-on-activate')
}, {
	name: 'handleMutationsViaTree',
	kind: 'boolean',
	// @ts-ignore FIXME
	element: document.getElementById('handle-mutations-via-tree')
}]

function restoreOptions() {
	browser.storage.sync.get(defaultSettings, function(items) {
		for (const option of options) {
			const name = option.name
			const saved = items[name]

			switch (option.kind) {
				case 'choice':
					(document.getElementById(`radio-${saved}`) as HTMLInputElement).checked = true
					break
				case 'individual':
					option.element.value = saved
					break
				case 'boolean':
					option.element.checked = saved
					break
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
						option.element.value = String(defaultSettings[option.name])
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
		radio.addEventListener('change', function(event: Event) {
			const targ = event.target as HTMLInputElement
			if (!targ.parentElement?.parentElement) {
				throw Error('BUG: HTML structure not correct: Radios need a parent parent')
			}
			const pref = targ.parentElement.parentElement.getAttribute('data-pref')
			if (!pref) {
				throw Error('BUG: HTML structure not correct: missing data-pref attribute')
			}
			browser.storage.sync.set({
				[pref]: (event.target as HTMLInputElement).value
			})
		})
	}

	// @ts-ignore FIXME
	document.getElementById('reset-messages').onclick = resetMessages
	// @ts-ignore FIXME
	document.getElementById('reset-to-defaults').onclick = resetToDefaults
}

function updateResetDismissedMessagesButtonState() {
	const button = document.getElementById('reset-messages')
	const feedback = document.getElementById('reset-messages-feedback')

	browser.storage.sync.get(defaultDismissalStates, function(items) {
		for (const dismissalState in items) {
			if (items[dismissalState] === true) {
			// @ts-ignore FIXME
				button.dataset.someMessagesDismissed = String(true)
				// @ts-ignore FIXME
				feedback.innerText = ''
				return
			}
		}

		// @ts-ignore FIXME
		button.dataset.someMessagesDismissed = String(false)
		// @ts-ignore FIXME
		if (!feedback.innerText) {
			// @ts-ignore FIXME
			feedback.innerText =
				browser.i18n.getMessage('prefsResetMessagesNone')
		}
	})
}

function resetMessages(event: Event) {
	if ((event.target as HTMLInputElement).dataset.someMessagesDismissed === String(true)) {
		browser.storage.sync.set(defaultDismissalStates)
		// @ts-ignore FIXME
		document.getElementById('reset-messages-feedback')
			.innerText = browser.i18n.getMessage('prefsResetMessagesDone')
	}
}

function dismissalStateChanged(keyThatChanged: string) {
	return defaultDismissalStates.hasOwnProperty(keyThatChanged)
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
			// @ts-ignore FIXME
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
