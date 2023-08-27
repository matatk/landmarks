export function withActiveTab(doThis: (tab: chrome.tabs.Tab) => void) {
	browser.tabs.query({ active: true, currentWindow: true }, tabs => {
		doThis(tabs[0])
	})
}

export function withAllTabs(doThis: (tabs: chrome.tabs.Tab[]) => void) {
	browser.tabs.query({}, tabs => {
		doThis(tabs)
	})
}
