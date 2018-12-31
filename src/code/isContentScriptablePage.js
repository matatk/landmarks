/* eslint-disable indent */
const specialPages
	= BROWSER === 'firefox' ? /^https:\/\/addons.mozilla.org/
	: BROWSER === 'chrome' ? /^https:\/\/chrome.google.com\/webstore/
	: BROWSER === 'opera' ? /^https:\/\/addons.opera.com/
	: BROWSER === 'edge' ? /^https:\/\/www.microsoft.com\/*?\/store/
	: null
/* eslint-enable indent */

export default function isContentScriptablePage(url) {
	if (/^(https?|file):\/\//.test(url) && !specialPages.test(url)) {
		return true
	}
	if (BROWSER === 'firefox') {
		const helpPageUrl = browser.runtime.getURL('help.html')
		if (url === helpPageUrl) {
			return true
		}
	}
	return false
}