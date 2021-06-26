export function withActiveTab(doThis) {
	browser.tabs.query({ active: true, currentWindow: true }, tabs => {
		doThis(tabs[0])
	})
}

export function withAllTabs(doThis) {
	browser.tabs.query({}, tabs => {
		doThis(tabs)
	})
}
