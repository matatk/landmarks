import handlePopulateCommandsMessage from './keyboardShortcutTableMaker'

function messageHandler(message) {
	if (message.name !== 'populate-commands') return

	const allShortcutsAreSet = handlePopulateCommandsMessage(
		message, 'keyboard-shortcuts-table')

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
	const fragment = window.location.hash.substr(2)
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
	browser.runtime.onMessage.addListener(messageHandler)
	browser.runtime.sendMessage({ name: 'get-commands' })

	if (BROWSER === 'firefox') {
		document.getElementById('open-browser-shortcuts-settings')
			.parentElement.remove()
	} else {
		document.getElementById('open-browser-shortcuts-settings').addEventListener(
			'click', () => browser.runtime.sendMessage({
				name: 'open-configure-shortcuts' }))
	}

	includeVersionNumber()
	reflectInstallOrUpdate()
}

main()
