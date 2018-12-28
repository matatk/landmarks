'use strict'
const path = require('path')

const testCodePath = path.join(__dirname, 'test-code-in-harness-contrast.js')

let contrastChecker

exports['test the damage report machine'] = function(assert) {
	assert.ok(true, 'damage report machine intact')
}

exports['test white on black'] = function(assert) {
	assert.equal(
		contrastChecker.contrastRatio('#ffffff', '#000000'),
		21,
		'21:1')
}

exports['test red on white'] = function(assert) {
	assert.equal(
		contrastChecker.contrastRatio('#ff0000', '#ffffff').toFixed(2),
		'4.00',
		'4.00:1')
}

exports['test white on pink'] = function(assert) {
	assert.equal(
		contrastChecker.contrastRatio('#ffffff', '#ff2f92').toFixed(2),
		'3.46',
		'3.46:1')
	// Note: http://contrast-ratio.com/#%23FF2F92-on-white says 3.45:1
}

exports['test black on pink'] = function(assert) {
	assert.equal(
		contrastChecker.contrastRatio('#000000', '#ff2f92').toFixed(2),
		'6.07',
		'6.07:1')
}

exports['test label colour for pink'] = function(assert) {
	assert.equal(
		contrastChecker.foregroundTextColour('#ff2f92', 18, true),
		'white',
		'white')
}

exports['test label colour for pink, small text'] = function(assert) {
	assert.equal(
		contrastChecker.foregroundTextColour('#ff2f92', 14, true),
		'white',
		'white')
}

exports['test label colour for pink, small text, not bold'] = function(assert) {
	assert.equal(
		contrastChecker.foregroundTextColour('#ff2f92', 14, false),
		'black',
		'black')
}

exports['test label colour for orange'] = function(assert) {
	assert.equal(
		contrastChecker.foregroundTextColour('#ff9300', 18, true),
		'black',
		'black')
}

if (module === require.main) {
	const ContrastChecker = require(testCodePath)
	contrastChecker = new ContrastChecker()

	require('test').run(exports)
}
