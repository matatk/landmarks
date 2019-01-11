import disconnectingPortErrorCheck from './disconnectingPortErrorCheck'

let port
let shortcutNotSet = false

const shortcutTableRows = [
	{
		element: 'tr',
		contains: [
			{ element: 'th', content: 'Action' },
			{ element: 'th', content: 'Keyboard shortcut' }
		]
	}
]

const keyboardShortcutsLink = {
	element: 'a',
	class: 'configAction',
	tabindex: 0,
	content: 'Add or change shortcuts',
	listen: [{
		event: 'click',
		handler: () => port.postMessage({
			name: 'splash-open-configure-shortcuts'
		})
	}, {
		event: 'keydown',
		handler: (event) => {
			if (event.key === 'Enter') {
				port.postMessage({
					name: 'splash-open-configure-shortcuts'
				})
			}
		}
	}]
}

const settingsLink = {
	element: 'a',
	class: 'configAction',
	tabindex: 0,
	content: 'Change preferences (opens in new tab)',
	listen: [{
		event: 'click',
		handler: () => {
			port.postMessage({
				name: 'splash-open-settings'
			})
		}
	}, {
		event: 'keydown',
		handler: (event) => {
			if (event.key === 'Enter') {
				port.postMessage({
					name: 'splash-open-configure-shortcuts'
				})
			}
		}
	}]
}

function makeHTML(structure, root) {
	let newElement

	for (const key in structure) {
		switch (key) {
			case 'element':
				newElement = document.createElement(structure[key])
				root.appendChild(newElement)
				break
			case 'class':
				newElement.classList.add(structure[key])
				break
			case 'tabindex':
				newElement.setAttribute('tabindex', String(structure[key]))
				break
			case 'text':
				root.appendChild(document.createTextNode(structure[key]))
				break
			case 'content':
				newElement.appendChild(document.createTextNode(structure[key]))
				break
			case 'listen':
				for (const eventHandler of structure[key]) {
					newElement.addEventListener(
						eventHandler.event, eventHandler.handler)
				}
				break
			case 'contains':
				for (const contained of structure[key]) {
					makeHTML(contained, newElement ? newElement : root)
				}
				break
			default:
				throw Error(`Unexpected structure key ${key} encountered.`)
		}
	}

	return root
}

function addCommandRowAndReportIfMissing(command) {
	// Work out the command's friendly name
	let action

	if (command.name === '_execute_browser_action') {
		action = 'Show pop-up'
	} else if (BROWSER === 'chrome' || BROWSER === 'opera') {
		// Chrome returns the full descriptions
		action = command.description
	} else {
		// Firefox requires the descriptions to be translated
		const messageName = command.description.slice(6, -2)
		action = browser.i18n.getMessage(messageName)
	}

	// Work out the command's shortcut
	let shortcutCellElement

	if (command.shortcut) {
		// Firefox gives "Alt+Shift+N" but Chrome gives ⌥⇧N
		if (BROWSER === 'chrome' || BROWSER === 'opera') {
			shortcutCellElement = { element: 'td', contains: [
				{ element: 'kbd', content: command.shortcut }
			]}
		} else {
			shortcutCellElement = { element: 'td', contains:
				firefoxShortcutElements(command.shortcut)
			}
		}
	} else {
		shortcutCellElement = { element: 'td', class: 'errorItem', contains: [
			{ text: 'Not set up' }
		]}
		shortcutNotSet = true
	}

	shortcutTableRows.push({
		element: 'tr',
		contains: [
			{ element: 'td', content: action },
			shortcutCellElement
		]
	})
}

function firefoxShortcutElements(shortcut) {
	const shortcutElements = []
	const shortcutParts = shortcut.split(/(\+)/)

	for (const keyOrPlus of shortcutParts) {
		if (keyOrPlus !== '+') {
			shortcutElements.push({ element: 'kbd', content: keyOrPlus })
		} else {
			shortcutElements.push({ text: ' + ' })
		}
	}

	return shortcutElements
}

function messageHandler(message) {  // also sendingPort
	if (message.name !== 'splash-populate-commands') return

	// Chrome allows only four keyboard shortcuts to be specified in the
	// manifest; Firefox allows many.
	//
	// The extra ones for Firefox are patched in via its specific manifest file
	// when the manifest is merged.
	//
	// The commands are in the manifest in the opposite order to that which
	// seems most logical, and need to be reversed to pop out in the right
	// order on the splash page. This is because the merging in of the extra
	// keyboard shortcuts means that the commands with added keyboard shortucts
	// in Firefox are bumped to the top of the commands object.
	//
	// What is a bit odd is that, on Chrome, it appears the reversal is not
	// needed.
	const commandsInOrder = (BROWSER === 'chrome' || BROWSER === 'opera') ?
		message.commands : message.commands.reverse()

	for (const command of commandsInOrder) {
		addCommandRowAndReportIfMissing(command)
	}

	makeHTML({ element: 'table', contains: shortcutTableRows },
		document.getElementById('keyboard-shortcuts-table'))

	if (shortcutNotSet) {
		document.querySelector('#section-keyboard-navigation summary')
			.classList.add('errorItem')

		document.querySelector('[data-link="shortcuts"] a')
			.classList.add('errorAction')

		for (const warning of document.querySelectorAll('[data-warning]')) {
			warning.style.display = 'block'
		}

		document.getElementById('symbol').style.display = 'inline'
	}
}

function makeConfigLinks(type, template) {
	for (const element of document.querySelectorAll(`[data-link="${type}"`)) {
		makeHTML(template, element)
	}
}

function makeSettingsAndShortcutsLinks() {
	if (BROWSER === 'chrome' || BROWSER === 'opera') {
		makeConfigLinks('shortcuts', keyboardShortcutsLink)
	}

	makeConfigLinks('settings', settingsLink)
}

function includeVersionNumber() {
	const manifest = browser.runtime.getManifest()
	const version = manifest.version
	document.getElementById('version').innerText = version
}

function reflectInstallOrUpdate() {
	const fragment = window.location.hash.substr(2)
	switch (fragment) {
		case 'install':
			document.getElementById('actions-update').remove()
			break
		case 'update':
			document.getElementById('actions-install').remove()
			document.getElementById('section-new').open = true
			break
		default:
			// User opened the help page during normal use
			document.getElementById('actions-install').remove()
			document.getElementById('actions-update').remove()
	}
}

function allowLinksToOpenSections() {
	for (const link of document.querySelectorAll('a[href]')) {
		if (link.getAttribute('href').startsWith('#')) {
			link.onclick = function() {
				document.querySelector(this.getAttribute('href')).open = true
			}
		}
	}
}

function main() {
	port = browser.runtime.connect({ name: 'splash' })
	port.onDisconnect.addListener(disconnectingPortErrorCheck)
	port.onMessage.addListener(messageHandler)
	port.postMessage({ name: 'get-commands' })

	if (BROWSER !== 'firefox' && BROWSER !== 'opera') {
		document.getElementById('section-sidebar').open = false
	}

	makeSettingsAndShortcutsLinks()
	includeVersionNumber()
	reflectInstallOrUpdate()
	allowLinksToOpenSections()
}

main()
