'use strict'
// FIXME localise (remember: table headings, button contents, ...)
// FIXME what to do when content script is re-loaded and disconnected in Blink

const chromeLike = window.chrome ? true : false

const tableRows = [
	{
		element: 'tr',
		contains: [
			{ element: 'th', content: 'Action' },
			{ element: 'th', content: 'Keyboard shortcut' }
		]
	}
]

const splashPage = {
	contains: [
		{ element: 'h1', content: 'Welcome to Landmarks' },
		{
			element: 'table',
			contains: tableRows
		}
	]
}

const chromeKeyboardShortcutsButton = {
	element: 'p', contains: [{
		element: 'button',
		content: 'Add or change shortcuts',
		listen: {
			event: 'click',
			handler: () => browser.runtime.sendMessage({
				request: 'splash-open-configure-shortcuts'
			})
		}
	}]
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


function splashFirst(parent, element) {
	parent.insertBefore(makePart(splashPage, element), parent.firstChild)
}


browser.runtime.onMessage.addListener(function(message) {
	if (message.request !== 'splash-populate-commands') return

	let missingShortcuts = false

	for (const command of message.commands) {
		// Work out the command's friendly name
		let action

		if (command.name === '_execute_browser_action') {
			action = 'Show pop-up'
		} else if (chromeLike) {
			// Chrome returns the full descriptions
			action = command.description
		} else {
			// Firefox requires the descriptions to be translated
			const messageName = command.description.slice(6, -2)
			action = browser.i18n.getMessage(messageName)
		}

		// Work out the command's shortcut
		// FIXME Firefox gives "Alt+Shift+N" but Chrome gives ⌥⇧N
		let shortcutCellElement

		if (command.shortcut) {
			const shortcutParts = command.shortcut.split(/(\+)/)
			const shortcutElements = []

			for (const keyOrPlus of shortcutParts) {
				if (keyOrPlus !== '+') {
					shortcutElements.push({ element: 'kbd', content: keyOrPlus })
				} else {
					shortcutElements.push({ text: ' + ' })
				}
			}

			shortcutCellElement = { element: 'td', contains: shortcutElements }
		} else {
			shortcutCellElement = { element: 'td', class: 'error' }
			missingShortcuts = true
		}

		tableRows.push({
			element: 'tr',
			contains: [
				{ element: 'td', content: action },
				shortcutCellElement
			]
		})
	}

	if (chromeLike) {
		splashPage.contains.push(chromeKeyboardShortcutsButton)
	}

	if (missingShortcuts) {
		splashPage.contains.push({ element: 'p', text: 'Missing shortcuts!' })
	}

	splashFirst(document.querySelector('main'), document.createElement('div'))
})


browser.runtime.sendMessage({
	request: 'get-commands'
})
