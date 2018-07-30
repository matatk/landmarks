'use strict'
/* exported defaultBorderSettings defaultSettings */

const defaultBorderSettings = Object.freeze({
	borderType: 'momentary',
	borderColour: '#ff2f92',
	borderFontSize: '16'
})

const defaultDebugSettings = Object.freeze({
	debugInfo: false
})

const defaultInterfaceSettings = Object.freeze({
	interface: 'popup'
})

// FIXME TODO don't include sidebar settings on Chrome when using rollup/similar
const defaultSettings = Object.freeze(
	Object.assign({},
		defaultBorderSettings, defaultDebugSettings, defaultInterfaceSettings))
