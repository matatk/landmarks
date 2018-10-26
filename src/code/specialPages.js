/* eslint-disable indent */
const specialPages
	= BROWSER === 'firefox' ? Object.freeze([
		/^https:\/\/addons.mozilla.org/
	])
	: BROWSER === 'chrome' ? Object.freeze([
		/^https:\/\/chrome.google.com\/webstore/
	])
	: BROWSER === 'opera' ? Object.freeze([
		/^https:\/\/addons.opera.com/
	])
	: BROWSER === 'edge' ? Object.freeze([
		/^https:\/\/www.microsoft.com\/*?\/store/
	])
	: null
/* eslint-enable indent */

export default specialPages
