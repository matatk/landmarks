import specialPages from './specialPages'

let contentScriptInjector = null

if (BROWSER !== 'firefox') {
	contentScriptInjector = function() {
		// Inject content script manually
		browser.tabs.query({}, function(tabs) {
			for (const i in tabs) {
				if (/^(https?|file):\/\//.test(tabs[i].url)) {  // TODO DRY
					// Don't inject the content script into special pages.
					// (Opera now appears to treat this as a blocking error, at
					// least with unpacked extensions, and performing this
					// check is cricket anyway.)
					let skipThisTab = false
					for (const specialPage of specialPages) {  // TODO DRY
						if (specialPage.test(tabs[i].url)) {
							skipThisTab = true
							break
						}
					}
					if (skipThisTab) continue

					console.log(`Injecting content script into tab ${tabs[i].id}`)
					browser.tabs.executeScript(tabs[i].id, {
						file: 'content.js'
					})
				}
			}
		})
	}
}

export default contentScriptInjector
