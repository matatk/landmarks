import test from 'ava'
import ContrastChecker from '../src/code/contrastChecker.js'

const contrastChecker = new ContrastChecker()

test('test white on black', t => {
	t.is(
		contrastChecker.contrastRatio('#ffffff', '#000000'),
		21,
		'21:1')
})

test('test red on white', t => {
	t.is(
		contrastChecker.contrastRatio('#ff0000', '#ffffff').toFixed(2),
		'4.00',
		'4.00:1')
})

test('test white on pink', t => {
	t.is(
		contrastChecker.contrastRatio('#ffffff', '#ff2f92').toFixed(2),
		'3.46',
		'3.46:1')
	// Note: http://contrast-ratio.com/#%23FF2F92-on-white says 3.45:1
})

test('test black on pink', t => {
	t.is(
		contrastChecker.contrastRatio('#000000', '#ff2f92').toFixed(2),
		'6.07',
		'6.07:1')
})

test('test label colour for pink', t => {
	t.is(
		contrastChecker.foregroundTextColour('#ff2f92', 18, true),
		'white',
		'white')
})

test('test label colour for pink, small text', t => {
	t.is(
		contrastChecker.foregroundTextColour('#ff2f92', 14, true),
		'white',
		'white')
})

test('test label colour for pink, small text, not bold', t => {
	t.is(
		contrastChecker.foregroundTextColour('#ff2f92', 14, false),
		'black',
		'black')
})

test('test label colour for orange', t => {
	t.is(
		contrastChecker.foregroundTextColour('#ff9300', 18, true),
		'black',
		'black')
})
