// TODO localise fully
let allShortcutsAreSet

const shortcutTableRows = [
	{
		element: 'tr',
		contains: [
			{ element: 'th', content: 'Action' },
			{ element: 'th', content: 'Keyboard shortcut' }
		]
	}
]

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
	const action = command.name === '_execute_browser_action'
		? 'Show pop-up'
		: command.description

	// Work out the command's shortcut
	let shortcutCellElement

	if (command.shortcut) {
		// Firefox gives "Alt+Shift+N" but Chrome (& Opera & Edge) gives ⌥⇧N
		if (BROWSER === 'firefox') {
			shortcutCellElement = { element: 'td', contains:
				firefoxShortcutElements(command.shortcut)
			}
		} else {
			shortcutCellElement = { element: 'td', contains: [
				{ element: 'kbd', content: command.shortcut }
			]}
		}
	} else {
		shortcutCellElement = {
			element: 'td', class: 'missing-shortcut', contains: [
				{ text: 'Not set up' }  // TODO: localise
			]}
		allShortcutsAreSet = false
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

export default function handlePopulateCommandsMessage(message, id) {
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

	allShortcutsAreSet = true

	const commandsInOrder = (BROWSER === 'firefox')
		? message.commands.reverse()
		: message.commands

	for (const command of commandsInOrder) {
		addCommandRowAndReportIfMissing(command)
	}

	makeHTML({ element: 'table', contains: shortcutTableRows },
		document.getElementById(id))

	return allShortcutsAreSet
}
