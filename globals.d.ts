interface ExtraBits {
	sidebarAction: {
		toggle: () => void
	}
}

interface Window {
	browser: typeof chrome & ExtraBits
}

var browser: typeof chrome & ExtraBits

var BROWSER: 'firefox' | 'chrome' | 'opera' | 'edge'
var INTERFACE: 'popup' | 'sidebar' | 'devtools'
var DEBUG: boolean

type LabelFontColour = 'black' | 'white'

type CallbackReturningElementInfo = () => LandmarkListEntry

type PageWarning = 'lintNoMain' | 'lintManyMains' | 'lintManyVisibleMainElements' | 'lintDuplicateUnlabelled'

type BaseLandmarkEntry = {
	type: 'landmark'
	element: HTMLElement
	name: string
	selector: string
	role: string
	roleDescription?: string
	label?: string
	guessed: boolean
	previous: LandmarkTreeEntry
	next: LandmarkTreeEntry
	warnings?: PageWarning[]
	selectorWasUpdated?: boolean
}

type LandmarkListEntry = BaseLandmarkEntry & {
	index: number
}

type LandmarkTreeEntry = BaseLandmarkEntry & {
	contains: LandmarkTreeEntry[]
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

type MessageForBackgroundScript = {
	name: 'landmarks'
	number: number
	tabId: number
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
} | {
	name: 'mutation-info'
} | {
	name: 'mutation-info-window'
} | {
	name: 'page-warnings'
} | {
	name: 'debug'
	info: string
	from?: chrome.runtime.MessageSender
}

type MessageFromDevTools = {
	name: 'init'
	tabId: number
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
