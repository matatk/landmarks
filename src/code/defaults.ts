//
// User preferences
//

type BorderSettings = {
	borderType: 'momentary' | 'persistent' | 'none'
	borderColour: string
	borderFontSize: string
}

export const defaultBorderSettings: BorderSettings = {
	borderType: 'momentary',
	borderColour: '#ff2f92',
	borderFontSize: '16'
} as const

type InterfaceSettings = {
	interface: 'popup' | 'sidebar'
}

export const defaultInterfaceSettings: InterfaceSettings | null =
	(BROWSER === 'firefox' || BROWSER === 'opera')
		? { interface: 'popup' } as const
		: null

type FunctionalitySettings = {
	guessLandmarks: boolean,
	closePopupOnActivate: boolean,
	handleMutationsViaTree: boolean
}

export const defaultFunctionalSettings: FunctionalitySettings = {
	guessLandmarks: true,
	closePopupOnActivate: false,
	handleMutationsViaTree: false
}

type Settings =
	BorderSettings & InterfaceSettings & FunctionalitySettings |
	BorderSettings & FunctionalitySettings

export const defaultSettings: Settings =
	(BROWSER === 'firefox' || BROWSER === 'opera')
		? Object.assign({},
			defaultBorderSettings,
			defaultInterfaceSettings,
			defaultFunctionalSettings)
		: Object.assign({},
			defaultBorderSettings,
			defaultFunctionalSettings)


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
