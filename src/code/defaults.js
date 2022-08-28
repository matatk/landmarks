//
// User preferences
//

export const defaultBorderSettings = /* #__PURE__ */Object.freeze({
	borderType: 'momentary',
	borderColour: '#ff2f92',
	borderFontSize: '16'
})

export const defaultInterfaceSettings =
	(BROWSER === 'firefox' || BROWSER === 'opera')
		? /* #__PURE__ */Object.freeze({ interface: 'popup' })
		: null

export const defaultFunctionalSettings = /* #__PURE__ */Object.freeze({
	guessLandmarks: true,
	closePopupOnActivate: false
})

export const defaultSettings =
	(BROWSER === 'firefox' || BROWSER === 'opera')
		? /* #__PURE__ */Object.freeze(/* #__PURE__ */Object.assign({},
			defaultBorderSettings,
			defaultInterfaceSettings,
			defaultFunctionalSettings))
		: /* #__PURE__ */Object.freeze(/* #__PURE__ */Object.assign({},
			defaultBorderSettings,
			defaultFunctionalSettings))


//
// Dismissal state of user interface messages
//

export const defaultDismissedSidebarNotAlone = /* #__PURE__ */Object.freeze(
	{ dismissedSidebarNotAlone: false })

export const defaultDismissedUpdate = /* #__PURE__ */Object.freeze(
	{ dismissedUpdate: false })

export const defaultDismissalStates =
	(BROWSER === 'firefox' || BROWSER === 'opera')
		? /* #__PURE__ */Object.freeze(/* #__PURE__ */Object.assign({},
			defaultDismissedSidebarNotAlone,
			defaultDismissedUpdate))
		: defaultDismissedUpdate
