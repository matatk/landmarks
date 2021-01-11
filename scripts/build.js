'use strict'
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const chalk = require('chalk')
const merge = require('deepmerge')
const archiver = require('archiver-promise')
const replace = require('replace-in-file')
const glob = require('glob')
const rollup = require('rollup')
const terser = require('rollup-plugin-terser').terser
const esformatter = require('rollup-plugin-esformatter')
const sharp = require('sharp')
const dependencyTree = require('dependency-tree')


//
// Static Configuration
//

const packageJson = require(path.join('..', 'package.json'))
const extName = packageJson.name
let extVersion = packageJson.version  // can be overidden on command line
const buildDir = 'build'
const srcStaticDir = path.join('src', 'static')
const srcAssembleDir = path.join('src', 'assemble')
const srcCodeDir = path.join('src', 'code')
const svgPath = path.join(srcAssembleDir, 'landmarks.svg')
const pngCacheDir = path.join(buildDir, 'png-cache')
const scriptCacheDir = path.join(buildDir, 'script-cache')
const localeSubDir = path.join('_locales')
const validBrowsers = Object.freeze(['firefox', 'chrome', 'opera', 'edge'])
const buildTargets = Object.freeze(validBrowsers.concat(['all']))

const browserPngSizes = Object.freeze({
	'firefox': [
		// Global: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/icons
		// Actions:
		//  * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_action#Choosing_icon_sizes
		//  * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action
		16,  // Toolbar/Sidebar
		32,  // Toolbar/Sidebar
		48,  // Extension
		96   // Extension
	],
	'chrome': [
		// Global: https://developer.chrome.com/extensions/manifest/icons
		// Action: https://developer.chrome.com/extensions/browserAction#icon
		16,  // Toolbar
		24,  // Toolbar (suggested 1.5x)
		32,  // Toolbar
		48,  // Extension
		128  // Extension
	],
	'opera': [
		// Global: https://dev.opera.com/extensions/manifest/#icons
		// Actions: https://dev.opera.com/extensions/browser-actions/
		16,  // Extension
		19,  // Toolbar/Action
		38,  // Toolbar/Action
		48,  // Extension
		128  // Extension
	],
	'edge': [
		// https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/part1-simple-extension#extension-icons-setup
		16,
		32,
		48,
		128
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
		const results = replace.sync({
			'files': files,
			'from': from,
			'to': to
		})
		const changedFiles = results
			.filter(result => result.hasChanged)
			.map(result => result.file)
		ok(message + ' in:', changedFiles.join('; '))
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


async function bundleCode(browser, debug) {
	logStep('Bundling JavaScript code')

	const ioPairsAndGlobals = [{
		mainSourceFile: path.join(srcCodeDir, '_background.js'),
		bundleFile: 'background.js'
	}, {
		mainSourceFile: path.join(srcCodeDir, '_content.js'),
		bundleFile: 'content.js'
	}, {
		mainSourceFile: path.join(srcCodeDir, '_options.js'),
		bundleFile: 'options.js'
	}, {
		mainSourceFile: path.join(srcCodeDir, '_help.js'),
		bundleFile: 'help.js'
	}, {
		mainSourceFile: path.join(srcCodeDir, '_gui.js'),
		bundleFile: 'popup.js',
		globals: { INTERFACE: 'popup' }
	}, {
		mainSourceFile: path.join(srcCodeDir, '_devtoolsRoot.js'),
		bundleFile: 'devtoolsRoot.js',
		globals: { INTERFACE: 'devtools' }
	}, {
		mainSourceFile: path.join(srcCodeDir, '_gui.js'),
		bundleFile: 'devtoolsPanel.js',
		globals: { INTERFACE: 'devtools' }
	}]

	if (browser === 'firefox' || browser === 'opera') {
		ioPairsAndGlobals.push({
			mainSourceFile: path.join(srcCodeDir, '_gui.js'),
			bundleFile: 'sidebar.js',
			globals: { INTERFACE: 'sidebar' }
		})
	}

	const scriptCacheName = debug ? `${browser}-debug` : browser
	const thisScriptCacheDir = path.join(scriptCacheDir, scriptCacheName)
	fse.ensureDirSync(thisScriptCacheDir)

	// Now create an array of full bundle options to pass to rollup. Each
	// element of these specifies all the common rollup and terser options.
	//
	// This only needs to be done if the script file is either not cached, or
	// the source has changed since the last time it was bundled.

	const bundleOptions = []

	for (const ioPair of ioPairsAndGlobals) {
		const cachedScript = path.join(thisScriptCacheDir, ioPair.bundleFile)
		const cachedScriptExists = fs.existsSync(cachedScript)
		const cacheModified = cachedScriptExists
			? fs.statSync(cachedScript).mtime
			: null

		const someSourcesAreNewer =
			[ioPair.mainSourceFile]
				.concat(dependencyTree.toList({
					filename: ioPair.mainSourceFile,
					directory: srcCodeDir
				}))
				.map(file => fs.statSync(file).mtime)
				.some(sourceModified => sourceModified > cacheModified)

		if (!cachedScriptExists || someSourcesAreNewer) {
			console.log(chalk.bold.blue(
				`Bundling ${ioPair.mainSourceFile} as ${ioPair.bundleFile}...`))

			const bundleOption = {}

			const defines = {
				BROWSER: browser,
				DEBUG: debug
			}

			for (const global in ioPair.globals) {
				defines[global] = ioPair.globals[global]
			}

			bundleOption.input = {
				input: ioPair.mainSourceFile,
				plugins: [terser({
					mangle: false,
					compress: {
						defaults: false,
						global_defs: defines, // eslint-disable-line camelcase
						conditionals: true,
						dead_code: true,      // eslint-disable-line camelcase
						evaluate: true,
						side_effects: true,   // eslint-disable-line camelcase
						switches: true,
						unused: true,
						passes: 2  // expand env vars; compresses their code
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
				file: cachedScript,
				format: 'iife'
			}

			bundleOptions.push(bundleOption)
		} else {
			console.log(chalk.bold.blue(`Using cached ${ioPair.bundleFile}`))
			fs.copyFileSync(cachedScript,
				path.join(pathToBuild(browser), ioPair.bundleFile))
		}
	}

	// Run each bundle we need to make through rollup, terser and esformatter.

	for (const options of bundleOptions) {
		const bundle = await rollup.rollup(options.input)
		await bundle.write(options.output)
		const basename = path.basename(options.output.file)
		const builtScript = path.join(pathToBuild(browser), basename)
		fs.copyFileSync(options.output.file, builtScript)
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

	const skipDots = (src) => !path.basename(src).startsWith('.')

	fse.copySync(srcStaticDir, pathToBuild(browser), { filter: skipDots })

	if (browser === 'chrome' || browser === 'edge') {
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
	copyOneGuiFile('devtoolsPanel', true, false)

	if (browser === 'firefox' || browser === 'opera') {
		copyOneGuiFile('sidebar', false, true)
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

	// Microsoft Partner Center has a linting bug whereby it fails to implement
	// the conventional browser extension message look-up technique. Demo repo:
	// https://github.com/matatk/partner-center-linting-bug
	//
	// An internal bug (Edge or Partner Center) was filed with ID 31045320
	if (browser === 'edge') {
		for (const locale of ['en_GB', 'en_US']) {
			const destinationDir = builtLocaleDir(browser, locale)
			const destinationFile = builtMessagesFile(browser, locale)
			fse.ensureDirSync(destinationDir)
			const fallbackMessagesJson = locale === 'en_GB'
				? {}
				: getMessagesOrEmpty('en_GB', 'common')
			const commonMessagesJson = getMessagesOrEmpty(locale, 'common')
			const merged = merge(fallbackMessagesJson, commonMessagesJson)
			fs.writeFileSync(destinationFile, JSON.stringify(merged, null, 2))
			ok(`messages.json written for Edge with workaround for ${locale}.`)
		}
		return
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
async function getPngs(browser) {
	logStep('Generating/copying in PNG files')
	const svgModified = fs.statSync(svgPath).mtime
	fse.ensureDirSync(pngCacheDir)

	function isOlderThanSvg(pngPath) {
		return fs.statSync(pngPath).mtime < svgModified
	}

	function isPngAbsentOrOutdated(pngPath) {
		return !fs.existsSync(pngPath) || isOlderThanSvg(pngPath)
	}

	for (const size of browserPngSizes[browser]) {
		const fileName = `landmarks-${size}.png`
		const cachedFileName = path.join(pngCacheDir, fileName)
		const buildFileName = path.join(pathToBuild(browser), fileName)

		if (isPngAbsentOrOutdated(cachedFileName)) {
			console.log(chalk.bold.blue(`Generating ${cachedFileName}...`))
			await sharp(svgPath)
				.resize(size, size)
				.toFile(cachedFileName)
		} else {
			console.log(chalk.bold.blue(`Using cached ${fileName}`))
		}

		fs.copyFileSync(cachedFileName, buildFileName)
	}
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
		.describe('test-release', 'Build an experimental release, which is falgged as being a test version')
		.boolean('test-release')
		.alias('test-release', 't')
		.describe('release', 'Override release in manifest.json. This should only be used when making test releases.')
		.string('release')
		.nargs('release', 1)
		.alias('release', 'r')
		.describe('clean-only', "Don't build; just remove existing build directory and ZIP.")
		.boolean('clean-only')
		.alias('clean-only', 'c')
		.describe('debug', 'Create a debug build, with console.timeStamp() calls included, which are used in profile recordings.')
		.boolean('debug')
		.alias('debug', 'd')
		.describe('skip-linting', "Don't run linters (if applicable) - makes the build process quicker")
		.boolean('skip-linting')
		.alias('skip-linting', 'k')
		.demandOption('browser')
		.argv

	if (argv.release) extVersion = argv.release

	const browsers = argv.browser === 'all'
		? validBrowsers
		: Array.isArray(argv.browser)
			? argv.browser
			: [argv.browser]

	const isFullBuild = argv.cleanOnly !== true
	const action = isFullBuild ? 'Building' : 'Cleaning'
	console.log(chalk.bold(`${action} ${extName} ${extVersion}...`))
	const debugMode = argv.debug === true

	testMode = argv.testRelease === true
	const testModeMessage = testMode ? ' (test version)' : ''

	for (const browser of browsers) {
		console.log()
		logStep(chalk.bold(`${action} for ${browser}${testModeMessage}`))
		clean(browser)
		if (isFullBuild) {
			copyStaticFiles(browser)
			await bundleCode(browser, debugMode)
			copyGuiFiles(browser)
			mergeMessages(browser)
			mergeManifest(browser)
			checkMessages(browser)
			await getPngs(browser)
			if (testMode) {
				renameTestVersion(browser)
			}
			await makeZip(browser)
			if (!argv.skipLinting && browser in linters) {
				await linters[browser]()
			}
		}
	}
}


main()
