interface Window {
	browser: typeof chrome
}

var browser: typeof chrome

var BROWSER: 'firefox' | 'chrome' | 'opera' | 'edge'
var INTERFACE: 'popup' | 'sidebar' | 'devtools'
var DEBUG: boolean

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

type ContentScriptMessage = {
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

type LandmarksMessage = {
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
}

type LandmarksDevToolsMessage = LandmarksMessage & {
	tabId: number
}
