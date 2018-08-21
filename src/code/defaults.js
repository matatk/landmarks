//
// User preferences
//

export const defaultBorderSettings = Object.freeze({
	borderType: 'momentary',
	borderColour: '#ff2f92',
	borderFontSize: '16'
})

export const defaultDebugSettings = Object.freeze({
	debugInfo: false
})

export const defaultInterfaceSettings = Object.freeze({
	interface: 'popup'
})

let _defaultSettings

switch (BROWSER) {
	case 'firefox':
	case 'opera':
		_defaultSettings = Object.freeze(Object.assign({},
			defaultBorderSettings,
			defaultDebugSettings,
			defaultInterfaceSettings))
		break
	case 'chrome':
	case 'edge':
		_defaultSettings = Object.freeze(Object.assign({},
			defaultBorderSettings,
			defaultDebugSettings))
		break
	default:
		throw Error(`Landmarks: invalid browser ${BROWSER} given.`)
}

export const defaultSettings = _defaultSettings


//
// Dismissal state of user interface messages
//

let _dismissalStates

if (BROWSER === 'firefox' || BROWSER === 'opera') {
	_dismissalStates = Object.freeze({
		dismissedSidebarNotAlone: false
	})
}

export const dismissalStates = _dismissalStates
