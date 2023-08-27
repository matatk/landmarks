interface Window {
	browser: typeof chrome
}

var browser: typeof chrome

var BROWSER: 'firefox' | 'chrome' | 'opera' | 'edge'
var INTERFACE: 'popup' | 'sidebar' | 'devtools'
var DEBUG: boolean

type LandmarkInfoEntry = {
	element: HTMLElement
	name: string
	selector: string
	role: string
	roleDescription?: string
	label?: string
	guessed: boolean
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
