/* eslint-disable indent */
const specialPages
	= BROWSER === 'firefox' ? /^https:\/\/addons.mozilla.org/
	: BROWSER === 'chrome' ? /^https:\/\/chrome.google.com\/webstore/
	: BROWSER === 'opera' ? /^https:\/\/addons.opera.com/
	: BROWSER === 'edge' ? /^https:\/\/microsoftedge.microsoft.com\/addons/
	: null
/* eslint-enable indent */

export function isContentInjectablePage(url) {
	if (/^(https?|file):\/\//.test(url) && !specialPages.test(url)) return true
	return false
}

export function isContentScriptablePage(url) {
	const isContentInjectable = isContentInjectablePage(url)
	const isContentScriptable =
		url.startsWith(browser.runtime.getURL('help.html')) ||
		url.startsWith(browser.runtime.getURL('options.html'))
	return isContentInjectable || isContentScriptable
}
