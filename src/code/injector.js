import specialPages from './specialPages.firefox.js'  // FIXME

export default function() {
	// Inject content script manually
	browser.tabs.query({}, function(tabs) {
		for (const i in tabs) {
			if (/^(https?|file):\/\//.test(tabs[i].url)) {  // TODO DRY
				// Don't inject the content script into special pages. (Opera
				// now appears to treat this as a blocking error, at least with
				// unpacked extensions, and performing this check is cricket
				// anyway.)
				let skipThisTab = false
				for (const specialPage of specialPages) {
					if (specialPage.test(tabs[i].url)) {
						skipThisTab = true
						break
					}
				}
				if (skipThisTab) continue

				browser.tabs.executeScript(tabs[i].id, {
					file: 'compatibility.js'
				}, function() {
					browser.tabs.executeScript(tabs[i].id, {
						file: 'landmarkName.js'
					}, function() {
						browser.tabs.executeScript(tabs[i].id, {
							file: 'defaults.js'
						}, function() {
							browser.tabs.executeScript(tabs[i].id, {
								file: 'contrast.js'
							}, function() {
								browser.tabs.executeScript(tabs[i].id, {
									file: 'landmarksFinder.js'
								}, function() {
									browser.tabs.executeScript(tabs[i].id, {
										file: 'elementFocuser.js'
									}, function() {
										browser.tabs.executeScript(tabs[i].id, {
											file:'pauseHandler.js'
										}, function() {
											browser.tabs.executeScript(tabs[i].id, {
												file: 'content.supervisor.js'
											})
										})
									})
								})
							})
						})
					})
				})
			}
		}
	})
}
