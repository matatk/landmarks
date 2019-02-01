import isContentScriptablePage from './isContentScriptablePage'

const contentScriptInjector = BROWSER === 'firefox' ? null : function() {
	// Inject content script manually
	browser.tabs.query({}, function(tabs) {
		for (const i in tabs) {
			if (isContentScriptablePage(tabs[i].url)) {
				browser.tabs.executeScript(tabs[i].id, { file: 'content.js' },
					() => browser.runtime.lastError)
			}
		}
	})
}

export default contentScriptInjector
