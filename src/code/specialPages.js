console.log(`specialPages: running on ${BROWSER}`)

let specialPages

switch (BROWSER) {
	case 'firefox':
		specialPages = Object.freeze([
			/^https:\/\/addons.mozilla.org/
		])
		break
	case 'chrome':
		specialPages = Object.freeze([
			/^https:\/\/chrome.google.com\/webstore/
		])
		break
	case 'opera':
		specialPages = Object.freeze([
			/^https:\/\/addons.opera.com/
		])
		break
	case 'edge':
		specialPages = Object.freeze([
			/^https:\/\/www.microsoft.com\/*?\/store/
		])
		break
	default:
		throw Error(`Landmarks: invalid browser ${BROWSER} given.`)
}

export default specialPages
