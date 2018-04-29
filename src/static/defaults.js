'use strict'
/* exported defaultBorderSettings defaultSettings */

const defaultBorderSettings = Object.freeze({
	borderType: 'momentary',
	borderColour: '#ff0000',
	borderLabelFontSize: '18'
})

const defaultDebugSettings = Object.freeze({
	debugInfo: false
})

const defaultSettings = Object.freeze(
	Object.assign({}, defaultBorderSettings, defaultDebugSettings))
