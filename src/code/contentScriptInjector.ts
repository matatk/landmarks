import { isContentInjectablePage } from './isContent.js'
import { withAllTabs } from './withTabs.js'

// TODO: Check this is tree-shaken in Firefox builds
export default function() {
	// Inject content script manually
	withAllTabs(function(tabs: chrome.tabs.Tab[]) {
		for (const tab of tabs) {
			if (isContentInjectablePage(tab.url)) {
				if (tab.id !== undefined) {
					browser.tabs.executeScript(tab.id, { file: 'content.js' },
						() => browser.runtime.lastError)
				}
			}
		}
	})
}
