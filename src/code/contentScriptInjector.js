import { isContentInjectablePage, isContentScriptablePage } from './isContent'

function ensureInjectedAndRun(tabId, url, runAfterInjection) {
	browser.tabs.sendMessage(tabId, { name: 'are-you-there' }, response => {
		if (browser.runtime.lastError) {
			browser.tabs.executeScript(
				tabId, { file: 'content.js' }, () => {
					if (!browser.runtime.lastError) {
						if (runAfterInjection) runAfterInjection()
					}
				})
		} else if (response === 'cake') {
			if (runAfterInjection) runAfterInjection()
		} else {
			console.error(`Injector: tab ${tabId} gave unexpected response`,
				response)
		}
	})
}

export function injectTab(tabId, url, runAfterInjection) {
	if (isContentInjectablePage(url)) {
		ensureInjectedAndRun(tabId, url, runAfterInjection)
	} else if (isContentScriptablePage(url)) {
		if (runAfterInjection) runAfterInjection()
	}
}

export function injectAllTabs() {
	browser.tabs.query({}, function(tabs) {
		for (const i in tabs) {
			injectTab(tabs[i].id, tabs[i].url, null)
		}
	})
}
