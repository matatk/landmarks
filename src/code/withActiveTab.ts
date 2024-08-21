export default function withActiveTab(doThis: (tab: chrome.tabs.Tab) => void) {
	browser.tabs.query({ active: true, currentWindow: true }, tabs => {
		doThis(tabs[0])
	})
}
