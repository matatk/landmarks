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

const defaultSettings = Object.freeze(
	Object.assign({}, defaultBorderSettings, defaultDebugSettings))
