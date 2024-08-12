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

// FIXME: This is used by the GUI when _receiving_ a message - naming wrong?
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

type DebugMessageFrom = typeof INTERFACE | 'content'

type DebugMessage = {
	name: 'debug'
	info: string
	from: DebugMessageFrom
	forTabId?: number
}

enum FromContentMessageName {
	ToggleStateIs = 'toggle-state-is',
	Landmarks = 'landmarks',
	GetDevToolsState = 'get-devtools-state',
	PageWarnings = 'page-warnings',
}

interface FromContentMessage {
	name: unknown
	payload: unknown
}

interface FromContentMessages extends Partial<Record<FromContentMessageName, FromContentMessage>> {
  [FromContentMessageName.ToggleStateIs]: {
    payload: {
    	state: 'selected' | 'all'
    }
  }
  [FromContentMessageName.Landmarks]: {
  	payload: {
			number: number
			tree: FilteredLandmarkTreeEntry[]
		}
  }
  [FromContentMessageName.PageWarnings]: {
		payload: PageWarning[]
  }
}

type FromContentMessageTypes = keyof FromContentMessages;
type FromContentMessagePayload<T extends FromContentMessageTypes> = FromContentMessages[T]['payload']


enum ForContentMessageName {
	GetLandmarks = 'get-landmarks',
	FocusLandmark = 'focus-landmark',
	ShowLandmark = 'show-landmark',
	HideLandmark = 'hide-landmark',
	NextLandmark = 'next-landmark',
	PrevLandmark = 'prev-landmark',
	MainLandmark = 'main-landmark',
	ToggleAllLandmarks = 'toggle-all-landmarks',
	GetToggleState = 'get-toggle-state',
	TriggerRefresh = 'trigger-refresh',
	DevToolsState = 'devtools-state',
	GetPageWarnings = 'get-page-warnings',
}

interface ForContentMessage {
	name: unknown
	payload: unknown
}

interface ForContentMessages extends Partial<Record<ForContentMessageName, ForContentMessage>> {
	[ForContentMessageName.GetLandmarks]: {
		paylaod: null
	}
	[ForContentMessageName.NextLandmark]: {
		paylaod: null
	}
	[ForContentMessageName.PrevLandmark]: {
		paylaod: null
	}
	[ForContentMessageName.MainLandmark]: {
		paylaod: null
	}
	[ForContentMessageName.ToggleAllLandmarks]: {
		paylaod: null
	}
	[ForContentMessageName.GetToggleState]: {
		paylaod: null
	}
	[ForContentMessageName.GetPageWarnings]: {
		paylaod: null
	}
	[ForContentMessageName.TriggerRefresh]: {
		paylaod: null
	}
  [ForContentMessageName.FocusLandmark]: {
    payload: {
    	index: number
    }
  }
  [ForContentMessageName.ShowLandmark]: {
    payload: {
    	index: number
    }
  }
  [ForContentMessageName.HideLandmark]: {
    payload: {
    	index: number
    }
  }
  [ForContentMessageName.DevToolsState]: {
  	payload: {
  		state: 'open' | 'closed'
		}
  }
}

type ForContentMessageTypes = keyof ForContentMessages;
type ForContentMessagePayload<T extends ForContentMessageTypes> = ForContentMessages[T]['payload']




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
