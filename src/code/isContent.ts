/* eslint-disable indent */
const specialPages
	= BROWSER === 'chrome' ? /^https:\/\/chromewebstore.google.com/
	: BROWSER === 'opera' ? /^https:\/\/addons.opera.com/
	: BROWSER === 'edge' ? /^https:\/\/microsoftedge.microsoft.com\/addons/
	: /* Firefox */ /^https:\/\/addons.mozilla.org/
/* eslint-enable indent */

export function isContentInjectablePage(url?: string) {
	if (!url) return false
	if (/^(https?|file):\/\//.test(url) && !specialPages.test(url)) return true
	return false
}

export function isContentScriptablePage(url: string) {
	const isContentInjectable = isContentInjectablePage(url)
	const isContentScriptable =
		url.startsWith(browser.runtime.getURL('help.html')) ||
		url.startsWith(browser.runtime.getURL('options.html'))
	return isContentInjectable || isContentScriptable
}
