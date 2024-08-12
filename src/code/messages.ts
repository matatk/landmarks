export interface MutationInfoWindowMessageData {
	'average-checked': number[]
	'average-mutations': number[]
	'checked-per-second': number[]
	'mutations-per-second': number[]
}

export interface MutationInfoMessageData {
	'average'?: number
	'checks'?: number
	'duration'?: number
	'mutationScans'?: number
	'mutations'?: number
	'nonMutationScans'?: number
	'pause'?: number
}

export type ToggleState = 'selected' | 'all'

// NOTE: Strong message typing; thank you https://timon.la/blog/background-script-message-typing/ :-)
// FIXME: make it elegant when payload is 'null'
// FIXME: inline the send functions
export enum MessageName {
	Debug = 'debug',
	DevToolsStateIs = 'devtools-state-is',
	FocusLandmark = 'focus-landmark',
	GetCommands = 'get-commands',
	GetDevToolsState = 'get-devtools-state',
	GetLandmarks = 'get-landmarks',
	GetPageWarnings = 'get-page-warnings',
	GetMutationInfo = 'get-mutation-info',
	GetToggleState = 'get-toggle-state',
	HideLandmark = 'hide-landmark',
	InitDevTools = 'init-devtools',
	Landmarks = 'landmarks',
	MainLandmark = 'main-landmark',
	MutationInfo = 'mutation-info',
	MutationInfoWindow = 'mutation-info-window',
	NextLandmark = 'next-landmark',
	OpenConfigureShortcuts = 'open-configure-shortcuts',
	OpenHelp = 'open-help',
	OpenSettings = 'open-settings',
	PageWarnings = 'page-warnings',
	PopulateCommands = 'populate-commands',
	PrevLandmark = 'prev-landmark',
	ShowLandmark = 'show-landmark',
	ToggleAllLandmarks = 'toggle-all-landmarks',
	ToggleStateIs = 'toggle-state-is',
	TriggerRefresh = 'trigger-refresh',
}

interface Message {
	payload: unknown
}

interface ForTabId { forTabId: number }

interface Messages extends Partial<Record<MessageName, Message>> {
	[MessageName.Debug]: { payload: { ui: typeof INTERFACE | 'content'; info: string } }
	[MessageName.DevToolsStateIs]: { payload: { state: 'open' | 'closed' } }
	[MessageName.FocusLandmark]: { payload: { index: number } }
	[MessageName.GetCommands]: { payload: null }
	[MessageName.GetDevToolsState]: { payload: null }
	[MessageName.GetLandmarks]: { payload: null }
	[MessageName.GetPageWarnings]: { payload: null }
	[MessageName.GetMutationInfo]: { payload: null }
	[MessageName.GetToggleState]: { payload: null }
	[MessageName.HideLandmark]: { payload: { index: number } }
	[MessageName.InitDevTools]: { payload: null }
	[MessageName.Landmarks]: { payload: null | { number: number; tree: FilteredLandmarkTreeEntry[] } }
	[MessageName.MainLandmark]: { payload: null }
	[MessageName.MutationInfo]: { payload: MutationInfoMessageData }
	[MessageName.MutationInfoWindow]: { payload: MutationInfoWindowMessageData }
	[MessageName.NextLandmark]: { payload: null }
	[MessageName.OpenConfigureShortcuts]: { payload: null }
	[MessageName.OpenHelp]: { payload: { openInSameTab: boolean } }
	[MessageName.OpenSettings]: { payload: null }
	[MessageName.PageWarnings]: { payload: PageWarning[] }
	[MessageName.PopulateCommands]: { payload: chrome.commands.Command[] }
	[MessageName.PrevLandmark]: { payload: null }
	[MessageName.ShowLandmark]: { payload: { index: number } }
	[MessageName.ToggleAllLandmarks]: { payload: null }
	[MessageName.ToggleStateIs]: { payload: { state: 'selected' | 'all' } }
	[MessageName.TriggerRefresh]: { payload: null }
}

export type MessageTypes = keyof Messages;
export type MessagePayload<T extends MessageTypes> = Messages[T]['payload']
export type MessagePayloadWithTabId<T extends MessageTypes> = Messages[T]['payload'] extends null
	? ForTabId
	: Messages[T]['payload'] & ForTabId

// FIXME: DRY?
// NOTE: Thank you https://matiashernandez.dev/blog/post/typescript-create-a-union-from-a-type or https://effectivetypescript.com/2020/05/12/unionize-objectify/ for the basis of this :-).
export type UMessage = {
	[k in keyof Messages]: {
		name: k,
		payload: Messages[k]['payload']
	}
}[keyof Messages]

// FIXME: DRY?
export type UMessageWithTabId = {
	[k in keyof Messages]: {
		name: k,
		payload: Messages[k]['payload'] extends null
			? ForTabId
			: Messages[k]['payload'] & ForTabId
	}
}[keyof Messages]

export function sendToExt<T extends MessageTypes>(name: T, payload: MessagePayload<T>): void {
	browser.runtime.sendMessage({ name, payload }, () => {
		if (browser.runtime.lastError) {
			if (DEBUG) console.error(browser.runtime.lastError.message)
		}
	})
}

export function sendToTab<T extends MessageTypes>(tabId: number, name: T, payload: MessagePayload<T>): void {
	browser.tabs.sendMessage(tabId, { name, payload }, () => {
		if (browser.runtime.lastError) {
			if (DEBUG) console.error(browser.runtime.lastError.message)
		}
	})
}

export function postToDev<T extends MessageTypes>(port: chrome.runtime.Port, name: T, payload: MessagePayload<T>): void {
	port.postMessage({ name, payload })
}

export function postFromDev<T extends MessageTypes>(port: chrome.runtime.Port, name: T, payload: MessagePayloadWithTabId<T>): void {
	port.postMessage({ name, payload })
}	
