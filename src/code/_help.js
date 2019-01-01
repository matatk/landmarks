import disconnectingPortErrorCheck from './disconnectingPortErrorCheck'
// FIXME localise (remember: table headings, button contents, ...)
// FIXME what to do when content script is re-loaded and disconnected in Blink

let port

const splashPage = {
	contains: [
		// more stuff is added later
	]
}

const shortcutTableRows = [
	{
		element: 'tr',
		contains: [
			{ element: 'th', content: 'Action' },
			{ element: 'th', content: 'Keyboard shortcut' }
		]
	}
]

const chromeKeyboardShortcutsLink = {
	element: 'p', contains: [{
		element: 'a',
		class: 'config',
		href: '#',
		content: 'Add or change shortcuts',
		listen: {
			event: 'click',
			handler: () => port.postMessage({
				name: 'splash-open-configure-shortcuts'
			})
		}
	}]
}

const settingsLink = {
	element: 'a',
	class: 'config',
	href: '#',
	content: 'Change preferences (opens in new tab)',
	listen: {
		event: 'click',
		handler: (event) => {
			port.postMessage({
				name: 'splash-open-settings'
			})
			event.preventDefault()  // until it opens in the same tab
		}
	}
}

function makePart(structure, root) {
	let newPart

	for (const key in structure) {
		switch (key) {
			case 'element':
				newPart = document.createElement(structure[key])
				root.appendChild(newPart)
				break
			case 'class':
				newPart.classList.add(structure[key])
				break
			case 'href':
				newPart.href = structure[key]
				break
			case 'text':
				root.appendChild(document.createTextNode(structure[key]))
				break
			case 'content':
				newPart.appendChild(document.createTextNode(structure[key]))
				break
			case 'listen':
				newPart.addEventListener(
					structure[key].event, structure[key].handler)
				break
			case 'contains':
				for (const contained of structure[key]) {
					makePart(contained, newPart ? newPart : root)
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
		shortcutCellElement = { element: 'td', class: 'error', contains: [
			{ text: 'Not set up' }
		]}
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

	splashPage.contains.push({
		element: 'table',
		contains: shortcutTableRows
	})

	makePart(splashPage, document.getElementById('insert-keyboard-shortcuts'))
}

function makePartInContainers(container, template) {
	const shortcutLinkContainers = document
		.querySelectorAll(`[data-link-container="${container}"`)
	for (const element of shortcutLinkContainers) {
		makePart(template, element)
	}
}

function main() {
	port = browser.runtime.connect({ name: 'splash' })
	port.onDisconnect.addListener(disconnectingPortErrorCheck)
	port.onMessage.addListener(messageHandler)
	port.postMessage({ name: 'get-commands' })

	if (BROWSER === 'chrome' || BROWSER === 'opera') {
		makePartInContainers('shortcuts', chromeKeyboardShortcutsLink)
	}

	makePartInContainers('settings', settingsLink)

	const manifest = browser.runtime.getManifest()
	const version = manifest.version
	document.getElementById('version').innerText = version

	const fragment = window.location.hash.substr(2)
	if (fragment === 'update') {
		document.getElementById('section-new').open = true
	}

	if (BROWSER === 'firefox' || BROWSER === 'opera') {
		document.getElementById('section-sidebar').open = true
	}
}

main()
