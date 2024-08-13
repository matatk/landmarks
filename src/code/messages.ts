// FIXME: somehow specify which messages can come from/to content script (and other scripts)
export enum MessageName {
	DevToolsStateIs = 'devtools-state-is',
	FocusLandmark = 'focus-landmark',
	GetDevToolsState = 'get-devtools-state',
	GetLandmarks = 'get-landmarks',
	GetPageWarnings = 'get-page-warnings',
	GetToggleState = 'get-toggle-state',
	HideLandmark = 'hide-landmark',
	Landmarks = 'landmarks',
	MainLandmark = 'main-landmark',
	NextLandmark = 'next-landmark',
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

interface Messages extends Partial<Record<MessageName, Message>> {
	[MessageName.DevToolsStateIs]: { payload: { state: 'open' | 'closed' } }
	[MessageName.FocusLandmark]: { payload: { index: number } }
	[MessageName.GetDevToolsState]: { payload: null }
	[MessageName.GetLandmarks]: { payload: null }
	[MessageName.GetPageWarnings]: { payload: null }
	[MessageName.GetToggleState]: { payload: null }
	[MessageName.HideLandmark]: { payload: { index: number } }
	[MessageName.Landmarks]: { payload: { number: number; tree: FilteredLandmarkTreeEntry[] } }
	[MessageName.MainLandmark]: { payload: null }
	[MessageName.NextLandmark]: { payload: null }
	[MessageName.PageWarnings]: { payload: PageWarning[] }
	[MessageName.PrevLandmark]: { payload: null }
	[MessageName.ShowLandmark]: { payload: { index: number } }
	[MessageName.ToggleAllLandmarks]: { payload: null }
	[MessageName.ToggleStateIs]: { payload: { state: 'selected' | 'all' } }
	[MessageName.TriggerRefresh]: { payload: null }
}

type MessageTypes = keyof Messages;
type MessagePayload<T extends MessageTypes> = Messages[T]['payload']

// FIXME: DRY?
// NOTE: Thank you https://matiashernandez.dev/blog/post/typescript-create-a-union-from-a-type or https://effectivetypescript.com/2020/05/12/unionize-objectify/ for the basis of this :-).
export type ObjectyMessages = {
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

export function sendMessageToContent<T extends MessageTypes>(tabId: number, name: T, payload: MessagePayload<T>): void {
	browser.tabs.sendMessage(tabId, { name, payload }).catch(err => {
		throw err 
	})
}
