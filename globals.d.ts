var browser: typeof chrome & {
	sidebarAction: {
		toggle: () => void
	}
}

var BROWSER: 'firefox' | 'chrome' | 'opera' | 'edge'
var INTERFACE: 'popup' | 'sidebar' | 'devtools'
var DEBUG: boolean

type UIMode = 'popup' | 'sidebar'
type LabelFontColour = 'black' | 'white'
type CallbackReturningElementInfo = () => LandmarkElementInfo | undefined  // NOTE: the content script checks there are landmarks
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
