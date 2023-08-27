// TODO localise fully
let allShortcutsAreSet

type StructuralElement = {
	kind: 'element'
	element: string
	class?: string
	contains?: StructuralElement[]
	content?: string
	tabindex?: number
} | {
	kind: 'text'
	text: string
}

const shortcutTableRows: StructuralElement[] = [
	{
		kind: 'element',
		element: 'tr',
		contains: [
			{ kind: 'element', element: 'th', content: 'Action' },
			{ kind: 'element', element: 'th', content: 'Keyboard shortcut' }
		]
	}
]

function makeHTML(structure: StructuralElement, root: HTMLElement) {
	if (structure.kind === 'element') {
		const newElement = document.createElement(structure[structure.kind])
		root.appendChild(newElement)

		for (const key in structure) {
			switch (key) {
				case 'class':
					newElement.classList.add(structure[key] as keyof typeof structure)
					break
				case 'tabindex':
					newElement.setAttribute('tabindex', String(structure[key]))
					break
				case 'content':
					newElement.appendChild(document.createTextNode(structure[key] as keyof typeof structure))
					break
				case 'contains':
					const container = structure[key] ?? []
					for (const contained of container) {
						makeHTML(contained, newElement ? newElement : root)
					}
					break
				default:
					throw Error(`Unexpected structure key "${key}" encountered.`)
			}
		}
	} else {
		root.append(structure['text'])
	}

	return root
}

function addCommandRowAndReportIfMissing(command: chrome.commands.Command) {
	// Work out the command's friendly name
	const action = command.name === '_execute_browser_action'
		? 'Show pop-up'
		: command.description

	// Work out the command's shortcut
	let shortcutCellElement: StructuralElement = { kind: 'element', element: 'td' }

	if (command.shortcut) {
		// Firefox gives "Alt+Shift+N" but Chrome (& Opera & Edge) gives ⌥⇧N
		if (BROWSER === 'firefox') {
			shortcutCellElement.contains = firefoxShortcutElements(command.shortcut)
		} else {
			shortcutCellElement.contains = [
				{ kind: 'element', element: 'kbd', content: command.shortcut }
			]
		}
	} else {
		shortcutCellElement.class = 'missing-shortcut'
		shortcutCellElement.contains = [
			{ kind: 'text', text: 'Not set up' }  // FIXME: localise
		]
		allShortcutsAreSet = false
	}

	shortcutTableRows.push({
		kind: 'element',
		element: 'tr',
		contains: [
			{ kind: 'element', element: 'td', content: action },
			shortcutCellElement
		]
	})
}

function firefoxShortcutElements(shortcut: string) {
	const shortcutElements: StructuralElement[] = []
	const shortcutParts = shortcut.split(/(\+)/)

	for (const keyOrPlus of shortcutParts) {
		if (keyOrPlus !== '+') {
			shortcutElements.push({ kind: 'element', element: 'kbd', content: keyOrPlus })
		} else {
			shortcutElements.push({ kind: 'text', text: ' + ' })
		}
	}

	return shortcutElements
}

export default function handlePopulateCommandsMessage(message: PopulateCommandsMessage, id: string) {
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

	// TODO: Compute existant ids from souce files
	const root = document.getElementById(id)
	if (root) {
		makeHTML({ kind: 'element', element: 'table', contains: shortcutTableRows }, root)
	}

	return allShortcutsAreSet
}
