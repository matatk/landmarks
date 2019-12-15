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


//
// Static Configuration
//

const packageJson = require(path.join('..', 'package.json'))
const extName = packageJson.name
const extVersion = packageJson.version
const buildDir = 'build'
const srcStaticDir = path.join('src', 'static')
const srcAssembleDir = path.join('src', 'assemble')
const srcCodeDir = path.join('src', 'code')
const svgPath = path.join(srcAssembleDir, 'landmarks.svg')
const pngCacheDir = path.join(buildDir, 'png-cache')
const localeSubDir = path.join('_locales')
const validBrowsers = Object.freeze(['firefox', 'chrome', 'opera'])
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


//
// State
//

let testMode = false	// are we building a test (alpha/beta) version?


//
// Utilities
//

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


function removeStuff(name, string, file) {
	const re = `<!-- ${string} -->[\\s\\S]*?<!-- \\/${string} -->\\s*`
	doReplace(
		file,
		new RegExp(re, 'g'),
		'',
		`Removed ${name} stuff`)
}


function zipFileName(browser) {
	const test = testMode ? '-test' : ''
	return extName + '-' + extVersion + test + '-' + browser + '.zip'
}


function checkForUnexpectedDotfiles() {
	const dotfiles = glob.sync(path.join(srcStaticDir, '.*'), {
		ignore: '**/.eslintrc.json'  // handled already
	})
	if (dotfiles.length > 0) {
		error(`The following unexpected files would be copied to the extension: ${dotfiles}`)
	}
}


function builtLocaleDir(browser, locale) {
	return path.join(pathToBuild(browser), localeSubDir, locale)
}


function builtMessagesFile(browser, locale) {
	return path.join(builtLocaleDir(browser, locale), 'messages.json')
}


//
// Build Steps
//

function clean(browser) {
	logStep('Cleaning build directory and ZIP file')

	fse.removeSync(pathToBuild(browser))
	fse.removeSync(zipFileName(browser))
}


async function flattenCode(browser, debug) {
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
			BROWSER: browser,
			DEBUG: debug
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

	function getMessagesOrEmpty(locale, mode) {
		const messagesFileName = `messages.${mode}.${locale}.json`
		const messagesPath = path.join(srcAssembleDir, messagesFileName)
		return fs.existsSync(messagesPath)
			? require(path.join('..', messagesPath))
			: {}
	}

	for (const locale of ['en_GB', 'en_US']) {
		const destinationDir = builtLocaleDir(browser, locale)
		const destinationFile = builtMessagesFile(browser, locale)

		fse.ensureDirSync(destinationDir)

		if (browser === 'firefox' || browser === 'opera') {
			const commonMessagesJson = getMessagesOrEmpty(locale, 'common')
			const uiMessagesJson = getMessagesOrEmpty(locale, 'interface')
			const merged = merge(commonMessagesJson, uiMessagesJson)
			fs.writeFileSync(destinationFile, JSON.stringify(merged, null, 2))
		} else {
			// Instead of just copying the common file, write it in the same
			// way as the merged one, so that diffs between builds are minimal.
			const commonMessagesJson = getMessagesOrEmpty(locale, 'common')
			if (commonMessagesJson !== {}) {
				fs.writeFileSync(destinationFile,
					JSON.stringify(commonMessagesJson, null, 2))
			}
		}

		ok(`messages.json written for ${browser} in ${locale} locale.`)
	}
}


function mergeManifest(browser) {
	logStep('Merging manifest.json')

	const common = path.join('..', srcAssembleDir, 'manifest.common.json')
	const extra = path.join('..', srcAssembleDir, `manifest.${browser}.json`)
	const commonJson = require(common)
	const extraJson = require(extra)

	function combineMerge(target, source, options) {
		const destination = target.slice()

		source.forEach((item, index) => {
			if (typeof destination[index] === 'undefined') {
				destination[index] = options.cloneUnlessOtherwiseSpecified(item, options)
			} else if (options.isMergeableObject(item)) {
				destination[index] = merge(target[index], item, options)
			} else if (target.indexOf(item) === -1) {
				destination.push(item)
			}
		})
		return destination
	}

	// Merging this way 'round just happens to make it so that, when merging
	// the arrays of scripts to include, the compatibility one comes first.
	const merged = merge(extraJson, commonJson, { arrayMerge: combineMerge })
	merged.version = extVersion
	fs.writeFileSync(
		path.join(pathToBuild(browser), 'manifest.json'),
		JSON.stringify(merged, null, 2)
	)

	ok(`manifest.json written for ${browser}.`)
}


function checkMessages(browser) {
	logStep('Checking for unused messages (except role names)')

	// We're only looking for the message keys, so any complete locale's
	// messages file will do; the default one seems most apt.
	const translationsFile = builtMessagesFile(browser, 'en_GB')
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


//
// Startup and options management
//

async function main() {
	const argv = require('yargs')
		.usage('Usage: $0 --browser <browser> [other options]')
		.help('help')
		.alias('help', 'h')
		.describe('browser', 'Build for a specific browser, or all browsers. Existing build directory and extension ZIP files are deleted first.')
		.choices('browser', buildTargets)
		.alias('browser', 'b')
		.describe('test-release', "Build an experimental release (Chrome-only: a Firefox test release can be uploaded to the add-on's beta channel).")
		.boolean('test-release')
		.alias('test-release', 't')
		.describe('clean-only', "Don't build; just remove existing build directory and ZIP.")
		.boolean('clean-only')
		.alias('clean-only', 'c')
		.describe('debug', 'Create a debug build, with console.timeStamp() calls included, which are used in profile recordings.')
		.boolean('debug')
		.alias('debug', 'd')
		.demandOption('browser')
		.argv

	const browsers = argv.browser === 'all'
		? validBrowsers
		: Array.isArray(argv.browser)
			? argv.browser
			: [argv.browser]

	const isFullBuild = argv.cleanOnly !== true
	const action = isFullBuild ? 'Building' : 'Cleaning'
	console.log(chalk.bold(`${action} ${extName} ${extVersion}...`))
	const sp = oneSvgToManySizedPngs(pngCacheDir, svgPath)
	const debugMode = argv.debug === true

	testMode = argv.testRelease === true
	if (testMode && argv.browser !== 'chrome') {
		error("Test build requested for browser(s) other than Chrome. This is not advisable: e.g. for Firefox, a version number such as '2.1.0alpha1' can be set instead and the extension uploaded to the beta channel. Only Chrome needs a separate extension listing for test versions.")
	}
	const testModeMessage = testMode ? ' (test version)' : ''

	checkForUnexpectedDotfiles()

	for (const browser of browsers) {
		console.log()
		logStep(chalk.bold(`${action} for ${browser}${testModeMessage}`))
		clean(browser)
		if (isFullBuild) {
			await flattenCode(browser, debugMode)
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
}


main()
