'use strict'
/* exported landmarksContentScriptInjector */

function landmarksContentScriptInjector() {
	// Inject content script manually
	browser.tabs.query({}, function(tabs) {
		for (const i in tabs) {
			if (/^https?:\/\//.test(tabs[i].url)) {
				browser.tabs.executeScript(tabs[i].id, {
					file: 'compatibility.js'
				}, function() {
					browser.tabs.executeScript(tabs[i].id, {
						file: 'content.finder.js'
					}, function() {
						browser.tabs.executeScript(tabs[i].id, {
							file: 'content.focusing.js'
						}, function() {
							browser.tabs.executeScript(tabs[i].id, {
								file: 'content.management.js'
							})
						})
					})
				})
			}
		}
	})
}
