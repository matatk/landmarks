import './compatibility'
import translate from './translate.js'
import { defaultSettings, defaultDismissalStates } from './defaults.js'


//
// Options
//

interface OptionBase { name: keyof typeof defaultSettings }
interface OptionElement { element: HTMLInputElement }

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
}, /* {
	name: 'handleMutationsViaTree',
	kind: 'boolean',
	element: document.getElementById('handle-mutations-via-tree')
} */]

function restoreOptions() {
	void browser.storage.sync.get(defaultSettings, function(items) {
		for (const option of options) {
			const name = option.name
			switch (option.kind) {
				case 'choice':
					(document.getElementById(`radio-${items[name]}`) as HTMLInputElement).checked = true
					break
				case 'individual':
					option.element.value = String(items[name])
					break
				case 'boolean':
					option.element.checked = Boolean(items[name])
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
						void browser.storage.sync.set({
							[option.name]: option.element.value
						})
					} else {
						option.element.value = String(defaultSettings[option.name])
					}
				})
				break
			case 'boolean':
				option.element.addEventListener('change', () => {
					void browser.storage.sync.set({
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
			void browser.storage.sync.set({
				[pref]: (event.target as HTMLInputElement).value
			})
		})
	}

	document.getElementById('reset-messages').onclick = resetMessages
	document.getElementById('reset-to-defaults').onclick = resetToDefaults
}

function updateResetDismissedMessagesButtonState() {
	const button = document.getElementById('reset-messages')
	const feedback = document.getElementById('reset-messages-feedback')

	void browser.storage.sync.get(defaultDismissalStates, function(items) {
		for (const dismissalState in items) {
			if (items[dismissalState] === true) {
				button.dataset.someMessagesDismissed = String(true)
				feedback.innerText = ''
				return
			}
		}

		button.dataset.someMessagesDismissed = String(false)
		if (!feedback.innerText) {
			feedback.innerText =
				browser.i18n.getMessage('prefsResetMessagesNone')
		}
	})
}

function resetMessages(event: Event) {
	if ((event.target as HTMLInputElement).dataset.someMessagesDismissed === String(true)) {
		void browser.storage.sync.set(defaultDismissalStates)
		document.getElementById('reset-messages-feedback')
			.innerText = browser.i18n.getMessage('prefsResetMessagesDone')
	}
}

function dismissalStateChanged(keyThatChanged: string) {
	return Object.hasOwn(defaultDismissalStates, keyThatChanged)
}

function resetToDefaults() {
	void browser.storage.sync.clear()
	restoreOptions()
}


//
// Entryway
//

function main() {
	if (BROWSER === 'firefox' || BROWSER === 'opera' || BROWSER === 'chrome') {
		options.push({
			// @ts-expect-error defaultSettings aren't defined, according to typescript. to include 'interface' FIXME
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
