import { isContentInjectablePage } from './isContent'
import { withAllTabs } from './withTabs'

const contentScriptInjector = BROWSER === 'firefox' ? null : function() {
	// Inject content script manually
	withAllTabs(function(tabs) {
		for (const i in tabs) {
			if (isContentInjectablePage(tabs[i].url)) {
				browser.tabs.executeScript(tabs[i].id, { file: 'content.js' },
					() => browser.runtime.lastError)
			}
		}
	})
}

export default contentScriptInjector
