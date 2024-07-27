var browser: typeof chrome & {
	sidebarAction: {
		toggle: () => void
	}
}

var BROWSER: 'firefox' | 'chrome' | 'opera' | 'edge'
var INTERFACE: 'popup' | 'sidebar' | 'devtools'
var DEBUG: boolean

type LabelFontColour = 'black' | 'white'

type CallbackReturningElementInfo = () =>LandmarkEntry

type PageWarning = 'lintNoMain' | 'lintManyMains' | 'lintManyVisibleMainElements' | 'lintDuplicateUnlabelled'

type LandmarkEntry = {
	type: 'landmark'
	element: HTMLElement
	selector: string
	role: string
	roleDescription: string | null  // TODO: switch to ? syntax
	label: string | null  // TODO: switch to ? syntax
	guessed: boolean
	previous?: LandmarkEntry  // TODO: should only be in Tree entry?
	next?: LandmarkEntry  // TODO: should only be in Tree entry?
	warnings?: PageWarning[]
	selectorWasUpdated?: boolean
	index?: number  // NOTE: only on list entries
	contains: LandmarkEntry[]
	debug: string
	level: LandmarkEntry[]
	index?: number
}

type FilteredLandmarkEntry = Omit<LandmarkEntry, "debug" | "level" | "element" | "selectorWasUpdated" | "previous" | "next" | "contains">

interface FilteredLandmarkTreeEntry extends Omit<LandmarkEntry, "debug" | "level" | "element" | "selectorWasUpdated" | "previous" | "next"> {
	contains: FilteredLandmarkTreeEntry[]
}

type PopulateCommandsMessage = {
	name: 'populate-commands'
	commands: chrome.commands.Command[]
}

type DebugMessage = {
	name: 'debug'
}

type MessageForContentScript = {
	name: 'get-landmarks'
} | {
	name: 'focus-landmark'
	index: number
} | {
	name: 'show-landmark'
	index: number
} | {
	name: 'hide-landmark'
	index: number
} | {
	name: 'next-landmark'
} | {
	name: 'prev-landmark'
} | {
	name: 'main-landmark'
} | {
	name: 'toggle-all-landmarks'
} | {
	name: 'get-toggle-state'
} | {
	name: 'trigger-refresh'
} | {
	name: 'devtools-state'
	state: 'open' | 'closed'
} | {
	name: 'get-page-warnings'
}

type ToggleState = 'selected' | 'all'

type MessageForBackgroundScript = {
	name: 'landmarks'
	number: number
	tabId: number
	tree: LandmarkEntry
} | {
	name: 'get-devtools-state'
} | {
	name: 'get-commands'
} | {
	name: 'open-configure-shortcuts'
} | {
	name: 'open-settings'
} | {
	name: 'open-help'
	openInSameTab: boolean
} | {
	name: 'toggle-state-is'
	data: ToggleState
} |
	MutationInfoMessage
|
	MutationInfoWindowMessage
| {
	name: 'page-warnings'
	data: PageWarning[]
} | DebugMessageForBackgroundScript

type DebugMessageForBackgroundScript = {
	name: 'debug'
	info: string
	from?: chrome.runtime.MessageSender | string // TODO: using the MessageSender part?
}

type MessageFromDevTools = {
	name: 'init'
	from: number
} | {
	name: 'get-landmarks'
	from: number
} | {
	name: 'get-toggle-state'
	from: number
} | {
	name: 'focus-landmark'
	from: number
} | {
	name: 'toggle-all-landmarks'
	from: number
} | {
	name: 'get-mutation-info'
	from: number
} | {
	name: 'get-page-warnings'
	from: number
}

type LandmarksDevToolsMessage = MessageForBackgroundScript & {
	tabId: number
}

type MutationInfoWindowMessage = {
	name: 'mutation-info-window'
	data: MutationInfoWindowMessageData
}

type MutationInfoWindowMessageData = {
	'average-checked': number[]
	'average-mutations': number[]
	'checked-per-second': number[]
	'mutations-per-second': number[]
}

type MutationInfoMessage = {
	name: 'mutation-info'
	data: MutationInfoMessageData
}

type MutationInfoMessageData = {
	'average'?: number
	'checks'?: number
	'duration'?: number
	'mutationScans'?: number
	'mutations'?: number
	'nonMutationScans'?: number
	'pause'?: number
}
