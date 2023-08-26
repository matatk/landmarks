import { isContentInjectablePage } from './isContent.js'
import { withAllTabs } from './withTabs.js'

// TODO: Check this is tree-shaken in Firefox builds
export default function() {
	// Inject content script manually
	withAllTabs(function(tabs: chrome.tabs.Tab[]) {
		for (const i in tabs) {
			if (isContentInjectablePage(tabs[i].url)) {
				const tabId = tabs[i].id  // TODO: TS: Really needed?
				if (tabId !== undefined) {
					browser.tabs.executeScript(tabId, { file: 'content.js' },
						() => browser.runtime.lastError)
				}
			}
		}
	})
}
