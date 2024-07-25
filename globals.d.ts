var browser: typeof chrome & {
	sidebarAction: {
		toggle: () => void
	}
}

var BROWSER: 'firefox' | 'chrome' | 'opera' | 'edge'
var INTERFACE: 'popup' | 'sidebar' | 'devtools'
var DEBUG: boolean

type LabelFontColour = 'black' | 'white'

// NOTE: the content script checks there are landmarks
type CallbackReturningElementInfo = () => LandmarkElementInfo | undefined

type PageWarning = 'lintNoMain' | 'lintManyMains' | 'lintManyVisibleMainElements' | 'lintDuplicateUnlabelled'

// NOTE: The '| null' pattern is used to keep the shape of the objects consistent, for perf.
// TODO: Check whether switching to '<key>?: <primary-type>' definitions affects perf.
// TODO: ...and adjust the '?' properties accordingly.
type LandmarkEntry = {
	type: 'landmark'
	element: HTMLElement
	selector: string
	role: string
	roleDescription: string | null
	label: string | null
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

type LandmarkElementInfo = Pick<LandmarkEntry, "element" | "role" | "roleDescription" | "label" | "guessed">
type LandmarkInfo = Omit<LandmarkElementInfo, "element">

type FilteredLandmarkEntry = Omit<LandmarkEntry, "debug" | "level" | "element" | "selectorWasUpdated" | "previous" | "next" | "contains">

interface FilteredLandmarkTreeEntry extends Omit<LandmarkEntry, "debug" | "level" | "element" | "selectorWasUpdated" | "previous" | "next"> {
	contains: FilteredLandmarkTreeEntry[]
}

type PopulateCommandsMessage = {
	name: 'populate-commands'
	commands: chrome.commands.Command[]
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
} | DebugMessage

type DebugMessageFor = typeof INTERFACE | 'content'

type DebugMessage = {
	name: 'debug'
	info: string
	from: DebugMessageFor
	forTabId?: number
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
