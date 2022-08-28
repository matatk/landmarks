//
// User preferences
//

export const defaultBorderSettings = Object.freeze({
	borderType: 'momentary',
	borderColour: '#ff2f92',
	borderFontSize: '16'
})

export const defaultInterfaceSettings =
	(BROWSER === 'firefox' || BROWSER === 'opera')
		? Object.freeze({ interface: 'popup' })
		: null

export const defaultFunctionalSettings = Object.freeze({
	guessLandmarks: true,
	closePopupOnActivate: false
})

export const defaultSettings =
	(BROWSER === 'firefox' || BROWSER === 'opera')
		? Object.freeze(Object.assign({},
			defaultBorderSettings,
			defaultInterfaceSettings,
			defaultFunctionalSettings))
		: Object.freeze(Object.assign({},
			defaultBorderSettings,
			defaultFunctionalSettings))


//
// Dismissal state of user interface messages
//

export const defaultDismissedSidebarNotAlone = Object.freeze(
	{ dismissedSidebarNotAlone: false })

export const defaultDismissedUpdate = Object.freeze(
	{ dismissedUpdate: false })

export const defaultDismissalStates =
	(BROWSER === 'firefox' || BROWSER === 'opera')
		? Object.freeze(Object.assign({},
			defaultDismissedSidebarNotAlone,
			defaultDismissedUpdate))
		: defaultDismissedUpdate
