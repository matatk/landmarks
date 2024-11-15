import { MessageName, MessagePayload, sendToExt } from './messages.js' 
import handlePopulateCommandsMessage from './keyboardShortcutTableMaker.js'
import translate from './translate.js'

function messageHandler(message: { name: MessageName.PopulateCommands, payload: MessagePayload<MessageName.PopulateCommands>}) {
	// NOTE: This check is needed, but the types make it look like it isn't.
	if (message.name !== MessageName.PopulateCommands) return

	const allShortcutsAreSet = handlePopulateCommandsMessage(
		message.payload, 'keyboard-shortcuts-table')

	document.getElementById('warning-shortcuts').hidden = allShortcutsAreSet

	if (!allShortcutsAreSet) {
		document.getElementById('section-keyboard-shortcuts-heading')
			.classList.add('missing-shortcut')
	}
}

function includeVersionNumber() {
	document.getElementById('version').innerText =
		browser.runtime.getManifest().version
}

function reflectInstallOrUpdate() {
	// Move the appropriate section to the top
	const fragment = window.location.hash.slice(2)
	let sectionToMove = null

	switch (fragment) {
		case 'install':
			sectionToMove = document.getElementById('section-features')
			break
		case 'update':
			sectionToMove = document.getElementById('section-new')
			break
	}

	if (sectionToMove) {
		document.getElementById('placeholder').appendChild(sectionToMove)
	}
}

function main() {
	translate()  // to refer to the "go to main" command; main and nav regions

	browser.runtime.onMessage.addListener(messageHandler)
	sendToExt(MessageName.GetCommands, null)

	if (BROWSER === 'firefox') {
		document.getElementById('shortcuts-button-wrapper')
			.remove()
	} else {
		document.getElementById('keyboard-shortcuts-instructions-firefox')
			.remove()
		document.getElementById('open-browser-shortcuts-settings')
			.addEventListener('click', () => {
				sendToExt(MessageName.OpenConfigureShortcuts, null)
			})
	}

	includeVersionNumber()
	reflectInstallOrUpdate()
}

main()
