/* eslint-disable indent */
const specialPages
	= BROWSER === 'firefox' ? /^https:\/\/addons.mozilla.org/
	: BROWSER === 'chrome' ? /^https:\/\/chrome.google.com\/webstore/
	: BROWSER === 'opera' ? /^https:\/\/addons.opera.com/
	: BROWSER === 'edge' ? /^https:\/\/microsoftedge.microsoft.com\/addons/
	: null
/* eslint-enable indent */

export function isContentInjectablePage(url) {
	// Don't consider about: chrome:// or opera:// as injectable
	if (/^(https?|file):\/\//.test(url) && !specialPages.test(url)) return true
	return false
}

export function isContentScriptablePage(url) {
	return isContentInjectablePage(url) ||
		url.startsWith(browser.runtime.getURL('help.html')) ||
		url.startsWith(browser.runtime.getURL('options.html')) ||
		url.startsWith(browser.runtime.getURL('permissions.html'))
}
