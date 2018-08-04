switch (BROWSER) {
	case 'firefox':
		break
	case 'chrome':
	case 'opera':
		window.browser = window.chrome
		break
	case 'edge':
		window.browser.commands = {
			onCommand: {
				addListener: function() {
					console.log('Landmarks: stub for browser.commands used.')
				}
			}
		}

		NodeList.prototype.forEach = Array.prototype.forEach
		break
	default:
		throw Error(`Landmarks: invalid browser ${BROWSER} given.`)
}
