// TODO: somehow specify which messages can come from/to content script (and other scripts)?
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
	Init = 'init',
	Landmarks = 'landmarks',
	MainLandmark = 'main-landmark',
	MutationInfo = 'mutation-info',
	MutationInfoWindow = 'mutation-info-window',
	NextLandmark = 'next-landmark',
	OpenConfigureShortcuts = 'open-configure-shortcuts',
	OpenHelp = 'open-help',
	OpenSettings = 'open-settings',
	PageWarnings = 'page-warnings',
	PrevLandmark = 'prev-landmark',
	ShowLandmark = 'show-landmark',
	ToggleAllLandmarks = 'toggle-all-landmarks',
	ToggleStateIs = 'toggle-state-is',
	TriggerRefresh = 'trigger-refresh',
}

interface Message {
	payload: unknown
}

// FIXME: DRY 'forTabId'?
interface Messages extends Partial<Record<MessageName, Message>> {
	[MessageName.Debug]: { payload: { ui: typeof INTERFACE | 'content'; info: string; forTabId?: number } }
	[MessageName.DevToolsStateIs]: { payload: { state: 'open' | 'closed' } }
	[MessageName.FocusLandmark]: { payload: { index: number } }
	[MessageName.GetCommands]: { payload: null }
	[MessageName.GetDevToolsState]: { payload: null }
	[MessageName.GetLandmarks]: { payload: null }
	[MessageName.GetPageWarnings]: { payload: null }
	[MessageName.GetMutationInfo]: { payload: null }
	[MessageName.GetToggleState]: { payload: null }
	[MessageName.HideLandmark]: { payload: { index: number } }
	[MessageName.Init]: { payload: { forTabId: number } }
	[MessageName.Landmarks]: { payload: null | { number: number; tree: FilteredLandmarkTreeEntry[] } }
	[MessageName.MainLandmark]: { payload: null }
	[MessageName.MutationInfo]: { payload: MutationInfoMessageData }
	[MessageName.MutationInfoWindow]: { payload: MutationInfoWindowMessageData }
	[MessageName.NextLandmark]: { payload: null }
	[MessageName.OpenConfigureShortcuts]: { payload: null }
	[MessageName.OpenHelp]: { payload: { openInSameTab: boolean } }
	[MessageName.OpenSettings]: { payload: null }
	[MessageName.PageWarnings]: { payload: PageWarning[] }
	[MessageName.PrevLandmark]: { payload: null }
	[MessageName.ShowLandmark]: { payload: { index: number } }
	[MessageName.ToggleAllLandmarks]: { payload: null }
	[MessageName.ToggleStateIs]: { payload: { state: 'selected' | 'all' } }
	[MessageName.TriggerRefresh]: { payload: null }
}

export type MessageTypes = keyof Messages;
export type MessagePayload<T extends MessageTypes> = Messages[T]['payload']

// FIXME: DRY?
// NOTE: Thank you https://matiashernandez.dev/blog/post/typescript-create-a-union-from-a-type or https://effectivetypescript.com/2020/05/12/unionize-objectify/ for the basis of this :-).
export type ObjectyMessage = {
	[k in keyof Messages]: {
		name: k,
		payload: Messages[k]['payload']
	}
}[keyof Messages]

// NOTE: Thank you https://timon.la/blog/background-script-message-typing/ :-)
// FIXME: make it elegant when payload is 'null'
// FIXME: inline
export function sendMessage<T extends MessageTypes>(name: T, payload: MessagePayload<T>): void {
	browser.runtime.sendMessage({ name, payload }).catch(err => {
		throw err 
	})
}

export function postMessage<T extends MessageTypes>(port: chrome.runtime.Port, name: T, payload: MessagePayload<T>): void {
	port.postMessage({ name, payload })
}

export function sendMessageToTab<T extends MessageTypes>(tabId: number, name: T, payload: MessagePayload<T>): void {
	browser.tabs.sendMessage(tabId, { name, payload }).catch(err => {
		throw err 
	})
}
