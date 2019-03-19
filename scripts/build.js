'use strict'
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const chalk = require('chalk')
const merge = require('deepmerge')
const archiver = require('archiver-promise')
const oneSvgToManySizedPngs = require('one-svg-to-many-sized-pngs')
const replace = require('replace-in-file')
const glob = require('glob')
const rollup = require('rollup')
const terser = require('rollup-plugin-terser').terser
const esformatter = require('rollup-plugin-esformatter')

const packageJson = require(path.join('..', 'package.json'))
const extName = packageJson.name
const extVersion = packageJson.version
const buildDir = 'build'
const srcStaticDir = path.join('src', 'static')
const srcAssembleDir = path.join('src', 'assemble')
const srcCodeDir = path.join('src', 'code')
const svgPath = path.join(srcAssembleDir, 'landmarks.svg')
const pngCacheDir = path.join(buildDir, 'png-cache')
const localeSubPath = path.join('_locales', 'en_GB')
const messagesSubPath = path.join(localeSubPath, 'messages.json')

const validBrowsers = Object.freeze([
	'firefox',
	'chrome',
	'opera',
])
const buildTargets = Object.freeze(validBrowsers.concat(['all']))

const browserPngSizes = Object.freeze({
	'firefox': [
		18,  // Firefox (toolbar)
		32,  // Firefox (menu panel) + Chrome (Windows)
		36,  // Firefox (toolbar x2)
		48,  // Both (general)
		64,  // Firefox (menu panel x2)
		96   // Firefox (general x2)
	],
	'chrome': [
		16,  // Chrome (favicon)
		19,  // Chrome (toolbar)
		32,  // Chrome (Windows) + Firefox (menu panel)
		38,  // Chrome (tooblar x2)
		48,  // Both   (general)
		128  // Chrome (store)
	],
	'opera': [
		// https://dev.opera.com/extensions/manifest/#icons
		// https://dev.opera.com/extensions/browser-actions/
		16,  // Icon
		19,  // Browser action
		38,  // Browser action
		48,  // Icon
		128  // Icon
	]
})

const linters = Object.freeze({
	'firefox': lintFirefox
})

let testMode = false	// are we building a test (alpha/beta) version?


function doReplace(files, from, to, message) {
	try {
		const changes = replace.sync({
			'files': files,
			'from': from,
			'to': to
		})
		ok(message + ' in:', changes.join(', '))
	} catch (err) {
		error('Error occurred:', err)
	}
}


function ok() {
	const argStrings = [...arguments].map(x => String(x))
	console.error(chalk.green.apply(this, ['✔'].concat(argStrings)))
}


function error() {
	const argStrings = [...arguments].map(x => JSON.stringify(x, null, 2))
	console.error(chalk.bold.red.apply(this, ['✖'].concat(argStrings)))
	process.exit(42)
}


// Log the start of a new step (styled)
function logStep(name) {
	console.log(chalk.underline(name + '...'))
}


// Return path for extension in build folder
function pathToBuild(browser) {
	if (validBrowsers.includes(browser)) {
		if (testMode) {
			return path.join(buildDir, browser + '-test')
		}
		return path.join(buildDir, browser)
	}

	error(`pathToBuild: invalid browser ${browser} given`)
}


async function flattenCode(browser) {
	logStep('Flattening JavaScript code')

	const ioPairsAndGlobals = [{
		input: path.join(srcCodeDir, '_background.js'),
		output: path.join(pathToBuild(browser), 'background.js')
	}, {
		input: path.join(srcCodeDir, '_content.js'),
		output: path.join(pathToBuild(browser), 'content.js')
	}, {
		input: path.join(srcCodeDir, '_options.js'),
		output: path.join(pathToBuild(browser), 'options.js')
	}, {
		input: path.join(srcCodeDir, '_help.js'),
		output: path.join(pathToBuild(browser), 'help.js')
	}, {
		input: path.join(srcCodeDir, '_gui.js'),
		output: path.join(pathToBuild(browser), 'popup.js'),
		globals: { INTERFACE: 'popup' }
	}]

	if (browser === 'firefox' || browser === 'opera') {
		ioPairsAndGlobals.push({
			input: path.join(srcCodeDir, '_gui.js'),
			output: path.join(pathToBuild(browser), 'sidebarPanel.js'),
			globals: { INTERFACE: 'sidebar' }
		})
	}

	if (browser === 'firefox' || browser === 'chrome' || browser === 'opera') {
		// Root DevTools HTML page script
		ioPairsAndGlobals.push({
			input: path.join(srcCodeDir, '_devtools.js'),
			output: path.join(pathToBuild(browser), 'devtools.js'),
			globals: { INTERFACE: 'devtools' }
		})

		// Landmarks DevTools panel
		ioPairsAndGlobals.push({
			input: path.join(srcCodeDir, '_gui.js'),
			output: path.join(pathToBuild(browser), 'devtoolsPanel.js'),
			globals: { INTERFACE: 'devtools' }
		})
	}

	// Now create an array of full bundle options to pass to rollup. Each
	// element of these specifies all the common rollup and terser options.

	const bundleOptions = []

	for (const ioPair of ioPairsAndGlobals) {
		const bundleOption = {}

		const defines = {
			BROWSER: browser
		}

		for (const global in ioPair.globals) {
			defines[global] = ioPair.globals[global]
		}

		bundleOption.input = {
			input: ioPair.input,
			plugins: [terser({
				mangle: false,
				compress: {
					defaults: false,
					global_defs: defines,  // eslint-disable-line camelcase
					conditionals: true,
					dead_code: true,       // eslint-disable-line camelcase
					evaluate: true,
					side_effects: true,    // eslint-disable-line camelcase
					switches: true,
					unused: true,
					passes: 2  // expands env vars, then compresses their code
				},
				output: {
					beautify: true,
					braces: true,
					comments: true
					// Others may be relevant: https://github.com/fabiosantoscode/terser/issues/92#issuecomment-410442271
				}
			}),
			esformatter()]
		}

		bundleOption.output = {
			file: ioPair.output,
			format: 'iife'
		}

		bundleOptions.push(bundleOption)
	}

	// Run each bundle through rollup, terser and esformatter.

	for (const options of bundleOptions) {
		const bundle = await rollup.rollup(options.input)
		await bundle.write(options.output)
	}
}


function removeStuff(name, string, file) {
	const re = `<!-- ${string} -->[\\s\\S]*?<!-- \\/${string} -->\\s*`
	doReplace(
		file,
		new RegExp(re, 'g'),
		'',
		`Removed ${name} stuff`)
}


function removeUIstuff(file) {
	removeStuff('UI', 'ui', file)
}


function removeDevToolsStuff(file) {
	removeStuff('DevTools', 'devtools', file)
}


function copyStaticFiles(browser) {
	logStep('Copying static files')

	fse.copySync(srcStaticDir, pathToBuild(browser))
	fs.unlinkSync(path.join(pathToBuild(browser), '.eslintrc.json'))

	if (browser === 'chrome') {
		removeUIstuff(path.join(pathToBuild(browser), 'options.html'))
		fs.unlinkSync(path.join(pathToBuild(browser), 'sidebar.css'))
	}
}


function copyGuiFiles(browser) {
	logStep('Copying root GUI HTML to create the popup and other bits')

	function copyOneGuiFile(destination, doUIRemove, doDevToolsRemove) {
		const destHtml = path.join(pathToBuild(browser), `${destination}.html`)
		fs.copyFileSync(path.join(srcAssembleDir, 'gui.html'), destHtml)
		doReplace(
			destHtml,
			'GUIJS',
			`${destination}.js`,
			`Referenced ${destination} code`)
		if (doUIRemove) removeUIstuff(destHtml)
		if (doDevToolsRemove) removeDevToolsStuff(destHtml)
	}

	copyOneGuiFile('popup', true, true)

	if (browser === 'firefox' || browser === 'opera') {
		copyOneGuiFile('sidebarPanel', false, true)
	}

	if (browser === 'firefox' || browser === 'chrome' || browser === 'opera') {
		copyOneGuiFile('devtoolsPanel', true, false)
	}
}


function mergeMessages(browser) {
	logStep('Merging messages JSON files')

	const common = path.join(srcAssembleDir, 'messages.common.json')
	const destinationDir = path.join(pathToBuild(browser), localeSubPath)
	const destinationFile = path.join(pathToBuild(browser), messagesSubPath)

	fse.ensureDirSync(destinationDir)

	if (browser === 'firefox' || browser === 'opera') {
		const ui = path.join(srcAssembleDir, 'messages.interface.json')
		const commonJson = require(path.join('..', common))
		const uiJson = require(path.join('..', ui))
		const merged = merge(commonJson, uiJson)
		fs.writeFileSync(destinationFile, JSON.stringify(merged, null, 2))
	} else {
		// Instead of just copying the common file, write it in the same way as
		// the merged one, so that diffs between builds are minimal.
		const commonJson = require(path.join('..', common))
		fs.writeFileSync(destinationFile, JSON.stringify(commonJson, null, 2))
	}

	ok(`messages.json written for ${browser}.`)
}


function mergeManifest(browser) {
	logStep('Merging manifest.json')

	const common = path.join('..', srcAssembleDir, 'manifest.common.json')
	const extra = path.join('..', srcAssembleDir, `manifest.${browser}.json`)
	const commonJson = require(common)
	const extraJson = require(extra)

	// For pre-2.0.0 deepmerge behaviour...
	// https://github.com/KyleAMathews/deepmerge#examples (and scroll a bit)
	const emptyTarget = value => Array.isArray(value) ? [] : {}
	const clone = (value, options) => merge(emptyTarget(value), value, options)

	function legacyArrayMerge(target, source, options) {
		const destination = target.slice()

		source.forEach(function(e, i) {
			if (typeof destination[i] === 'undefined') {
				const cloneRequested = options.clone !== false
				const shouldClone = cloneRequested && options.isMergeableObject(e)
				destination[i] = shouldClone ? clone(e, options) : e
			} else if (options.isMergeableObject(e)) {
				destination[i] = merge(target[i], e, options)
			} else if (target.indexOf(e) === -1) {
				destination.push(e)
			}
		})
		return destination
	}

	// Merging this way 'round just happens to make it so that, when merging
	// the arrays of scripts to include, the compatibility one comes first.
	const merged = merge(extraJson, commonJson, { arrayMerge: legacyArrayMerge })
	merged.version = extVersion
	fs.writeFileSync(
		path.join(pathToBuild(browser), 'manifest.json'),
		JSON.stringify(merged, null, 2)
	)

	ok(`manifest.json written for ${browser}.`)
}


function checkMessages(browser) {
	logStep('Checking for unused messages (except role names)')

	const translationsFile = path.join(pathToBuild(browser), messagesSubPath)
	const messages = JSON.parse(fs.readFileSync(translationsFile))
	const files = glob.sync(path.join(pathToBuild(browser), '**'), {
		nodir: true,
		ignore: ['**/messages.json']
	})
	const messageSummary = {}	// count usages of each message

	for (const messageName in messages) {
		messageSummary[messageName] = 0

		for (const file of files) {
			messageSummary[messageName] +=
				(fs.readFileSync(file).toString().match(
					new RegExp(messageName, 'g')) || []).length
		}

		if (messageName.startsWith('role')) {
			// The role names' calls are constructed dynamically (and are
			// probably OK).
			messageSummary[messageName] = '(not checked)'
		}
	}

	if (Object.values(messageSummary).some((x) => x === 0)) {
		error('Some messages are unused:', messageSummary)
	}
}


// Get PNG files from the cache (which will generate them if needed)
function getPngs(converter, browser) {
	logStep('Generating/copying in PNG files')

	browserPngSizes[browser].forEach((size) => {
		const pngPath = converter.getPngPath(size)
		const basename = path.basename(pngPath)
		fse.copySync(pngPath, path.join(pathToBuild(browser), basename))
	})
}


function renameTestVersion(browser) {
	logStep('Changing test version name in messages.json')

	doReplace(
		path.join(pathToBuild(browser), '**', 'messages.json'),
		/"Landmark(s| Navigation via Keyboard or Pop-up)"/g,
		'"Landmarks (test version)"',
		'Suffixed name to indicate test version')
}


function zipFileName(browser) {
	const test = testMode ? '-test' : ''
	return extName + '-' + extVersion + test + '-' + browser + '.zip'
}


async function makeZip(browser) {
	logStep('Createing ZIP file')

	const outputFileName = zipFileName(browser)
	const archive = archiver(outputFileName)

	archive.directory(pathToBuild(browser), false)
	await archive.finalize().then(function() {
		ok(archive.pointer() + ' total bytes for ' + outputFileName)
	})
}


async function lintFirefox() {
	const linter = require('addons-linter').createInstance({
		config: {
			_: [zipFileName('firefox')],
			logLevel: process.env.VERBOSE ? 'debug' : 'fatal',
		}
	})

	await linter.run().catch(err => error(err))
}


async function main() {
	const syntax = '--browser <browser> [--test-release]'
	const argv = require('yargs')
		.usage(`Usage: $0 ${syntax}`)
		.usage(`   or: npm run build -- ${syntax}`)
		.help('h')
		.alias('h', 'help')
		.describe('browser', 'Build for a specific browser, or all browsers')
		.choices('browser', buildTargets)
		.alias('browser', 'b')
		.describe('test-release', 'Build an experimental release (Chrome-only)')
		.boolean('test-release')
		.alias('test-release', 't')
		.demandOption('browser')
		.epilogue('Existing build directory and extension ZIP files are deleted first.')
		.argv

	testMode = argv.testRelease === true
	if (testMode && argv.browser !== 'chrome') {
		error("Test build requested for browser(s) other than Chrome. This is not advisable: e.g. for Firefox, a version number such as '2.1.0alpha1' can be set instead and the extension uploaded to the beta channel. Only Chrome needs a separate extension listing for test versions.")
	}

	console.log(chalk.bold(`Builing ${extName} ${extVersion}...`))
	const browsers = argv.browser === 'all' ? validBrowsers : [argv.browser]
	const sp = oneSvgToManySizedPngs(pngCacheDir, svgPath)
	const testModeMessage = testMode ? ' (test version)' : ''

	for (const browser of browsers) {
		console.log()
		logStep(chalk.bold(`Cleaning and building for ${browser}${testModeMessage}`))
		fse.removeSync(pathToBuild(browser))
		fse.removeSync(zipFileName(browser))
		await flattenCode(browser)
		copyStaticFiles(browser)
		copyGuiFiles(browser)
		mergeMessages(browser)
		mergeManifest(browser)
		checkMessages(browser)
		getPngs(sp, browser)
		if (testMode) {
			renameTestVersion(browser)
		}
		await makeZip(browser)
		if (browser in linters) {
			await linters[browser]()
		}
	}
}


main()
