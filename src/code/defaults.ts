//
// User preferences
//

const BORDER_TYPES = [ 'momentary', 'persistent', 'none' ] as const

type BorderType = typeof BORDER_TYPES[number]

export function isBorderType(value: unknown): value is BorderType {
	return BORDER_TYPES.includes(value as BorderType)
}

interface BorderSettings {
	borderType: BorderType
	borderColour: string
	borderFontSize: string
}

export const defaultBorderSettings: BorderSettings = {
	borderType: 'momentary',
	borderColour: '#ff2f92',
	borderFontSize: '16'
} as const

const INTERFACE_TYPES = [ 'popup', 'sidebar' ] as const

type InterfaceType = typeof INTERFACE_TYPES[number]

export function isInterfaceType(value: unknown): value is InterfaceType {
	return INTERFACE_TYPES.includes(value as InterfaceType)
}

interface InterfaceSettings {
	interface: InterfaceType
}

export const defaultInterfaceSettings: InterfaceSettings | null =
	(BROWSER === 'firefox' || BROWSER === 'opera')
		? { interface: 'popup' } as const
		: null

interface FunctionalitySettings {
	guessLandmarks: boolean,
	closePopupOnActivate: boolean,
	handleMutationsViaTree: boolean
}

export const defaultFunctionalSettings: FunctionalitySettings = {
	guessLandmarks: true,
	closePopupOnActivate: false,
	handleMutationsViaTree: false
} as const

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
