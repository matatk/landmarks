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

// FIXME TODO don't include sidebar settings on Chrome when using rollup/similar
export const defaultSettings = Object.freeze(
	Object.assign({},
		defaultBorderSettings, defaultDebugSettings, defaultInterfaceSettings))
