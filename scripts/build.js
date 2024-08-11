#!/usr/bin/env node
import path from 'path'
import fs from 'fs'

import archiver from 'archiver-promise'
import chalk from 'chalk'
import dependencyTree from 'dependency-tree'
import prettier from 'rollup-plugin-prettier'
import fse from 'fs-extra'
import { glob } from 'glob'
import merge from 'deepmerge'
import { replaceInFileSync } from 'replace-in-file'
import { rollup } from 'rollup'
import sharp from 'sharp'
import strip from '@rollup/plugin-strip'
import terser from '@rollup/plugin-terser'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import linter from 'addons-linter'

const requireJson = (path) =>
	JSON.parse(fs.readFileSync(new URL(path, import.meta.url)))


//
// Static Configuration
//

const packageJson = requireJson(path.join('..', 'package.json'))
const extName = packageJson.name
let extVersion = packageJson.version  // can be overidden on command line
const buildDir = 'build'
const srcAssembleDir = path.join('src', 'assemble')
const srcCodeDir = path.join('src', 'code')
const srcStaticDir = path.join('src', 'static')
const svgPath = path.join(srcAssembleDir, 'landmarks.svg')
const pngCacheDir = path.join(buildDir, 'png-cache')
const scriptCacheDir = path.join(buildDir, 'script-cache')
const localeSubDir = path.join('_locales')
const validBrowsers = Object.freeze(['firefox', 'chrome', 'opera', 'edge'])
const buildTargets = Object.freeze(validBrowsers.concat(['all']))

const browserPngSizes = Object.freeze({
	'firefox': {
		'internal': [
			// Global: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/icons
			// Actions:
			//  * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_action#Choosing_icon_sizes
			//  * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action
			16,  // Toolbar/Sidebar
			32,  // Toolbar/Sidebar
			48,  // Extension
			96   // Extension
		]
	},
	'chrome': {
		'internal': [
			// Global: https://developer.chrome.com/extensions/manifest/icons
			// Action: https://developer.chrome.com/extensions/browserAction#icon
			16,  // Toolbar
			24,  // Toolbar (suggested 1.5x)
			32,  // Toolbar
			48,  // Extension
			128  // Extension
		]
	},
	'opera': {
		'internal': [
			// Global: https://dev.opera.com/extensions/manifest/#icons
			// Actions: https://dev.opera.com/extensions/browser-actions/
			16,  // Extension
			19,  // Toolbar/Action
			38,  // Toolbar/Action
			48,  // Extension
			128  // Extension
		],
		'external': [
			64   // Store
		]
	},
	'edge': {
		'internal': [
			// https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/part1-simple-extension#extension-icons-setup
			16,
			32,
			48,
			128
		],
		'external': [
			300  // Store
		]
	}
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

// Log the start of a new step (styled)
function logStep(name) {
	console.log(chalk.underline(name + '...'))
}

function doReplace(files, from, to, message) {
	try {
		const results = replaceInFileSync({
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

function makeTerserOptions(globals) {
	return {
		mangle: false,
		compress: {
			defaults: false,
			global_defs: globals, // eslint-disable-line camelcase
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
	}
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
		mainSourceFile: path.join(srcCodeDir, browser === 'chrome' ? '_background.mv3.js' : '_background.js'),
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
				plugins: debug
					? [
						terser(makeTerserOptions(defines)),
						prettier({ parser: 'babel' })
					]
					: [
						strip({ functions: ['debugSend', 'debugLog'] }),
						terser(makeTerserOptions(defines)),
						prettier({ parser: 'babel' })
					]
			}

			bundleOption.output = {
				file: cachedScript,
				format: browser === 'chrome' && ioPair.bundleFile === 'background.js'
					? 'module'
					: 'iife'
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
		try {
			const bundle = await rollup(options.input)
			await bundle.write(options.output)
			const basename = path.basename(options.output.file)
			const builtScript = path.join(pathToBuild(browser), basename)
			fs.copyFileSync(options.output.file, builtScript)
		} catch(err) {
			console.error(err)
			process.exit(42)
		}
	}
}


function removeSidebarStuff(file) {
	removeStuff('sidebar', 'sidebar', file)
}


function copyStaticFiles(browser) {
	logStep('Copying static files')

	const skipDots = (src) => !path.basename(src).startsWith('.')

	fse.copySync(srcStaticDir, pathToBuild(browser), { filter: skipDots })

	if (browser === 'chrome' || browser === 'edge') {
		removeSidebarStuff(path.join(pathToBuild(browser), 'options.html'))
		fs.unlinkSync(path.join(pathToBuild(browser), 'sidebar.css'))
	}
}


function copyGuiFiles(browser) {
	logStep('Copying root GUI HTML to create the pop-up and other bits')

	function copyOneGuiFile(destination, isSidebar, isDevTools) {
		const destHtml = path.join(pathToBuild(browser), `${destination}.html`)
		fs.copyFileSync(path.join(srcAssembleDir, 'gui.html'), destHtml)
		doReplace(
			destHtml,
			'GUIJS',
			`${destination}.js`,
			`Referenced ${destination} code`)

		// The general gui.html file is organised such that non-DevTools stuff
		// is always wrapped in a 'popup-and-sidebar' block.
		if (isDevTools) {
			removeStuff('pop-up and sidebar', 'popup-and-sidebar', destHtml)
		} else {
			removeStuff('DevTools', 'devtools', destHtml)
			if (!isSidebar) removeSidebarStuff(destHtml)
		}
	}

	copyOneGuiFile('popup', false, false)
	copyOneGuiFile('devtoolsPanel', false, true)

	if (browser === 'firefox' || browser === 'opera') {
		copyOneGuiFile('sidebar', true, false)
	}
}


function mergeMessages(browser) {
	logStep('Merging messages JSON files')

	function getMessagesOrEmpty(locale, mode) {
		const messagesFileName = `messages.${mode}.${locale}.json`
		const messagesPath = path.join(srcAssembleDir, messagesFileName)
		return fs.existsSync(messagesPath)
			? requireJson(path.join('..', messagesPath))
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
	logStep('Merging/copying manifest.json')

	// NOTE: Eventually remove the need for this by moving all to MV3?
	if (browser === 'chrome') {
		const manifest = requireJson(path.join('..', srcAssembleDir, 'manifest.chrome.json'))
		// TODO: DRY the below?
		manifest.version = extVersion
		fs.writeFileSync(
			path.join(pathToBuild(browser), 'manifest.json'),
			JSON.stringify(manifest, null, 2)
		)
		return
	}

	const common = path.join('..', srcAssembleDir, 'manifest.common.json')
	const extra = path.join('..', srcAssembleDir, `manifest.${browser}.json`)
	const commonJson = requireJson(common)
	const extraJson = requireJson(extra)

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

	for (const [key, sizes] of Object.entries(browserPngSizes[browser])) {
		for (const size of sizes) {
			const fileName = `landmarks-${size}.png`
			const cachedFileName = path.join(pngCacheDir, fileName)

			if (isPngAbsentOrOutdated(cachedFileName)) {
				console.log(chalk.bold.blue(`Generating ${cachedFileName}...`))
				await sharp(svgPath)
					.resize(size, size)
					.toFile(cachedFileName)
			} else {
				console.log(chalk.bold.blue(`Using cached ${fileName}`))
			}

			if (key === 'internal') {
				const buildFileName = path.join(pathToBuild(browser), fileName)
				fs.copyFileSync(cachedFileName, buildFileName)
			}
		}
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


async function lintFirefox(lintFolderInsteadOfZip) {
	logStep('Linting ' + (lintFolderInsteadOfZip ? 'build folder' : 'ZIP file'))
	const path = lintFolderInsteadOfZip
		? pathToBuild('firefox')
		: zipFileName('firefox')
	const lintrunner = linter.createInstance({
		config: {
			_: [path],
			logLevel: process.env.VERBOSE ? 'debug' : 'fatal',
		}
	})

	await lintrunner.run().catch(err => error(err))
}


//
// Startup and options management
//

async function main() {
	const argv = yargs(hideBin(process.argv))
		.usage('Usage: $0 --browser <browser> [other options]')
		.help('help')
		.alias('help', 'h')
		.describe('browser', 'Build for a specific browser, or all browsers. Multiple browsers can be specified as repeat options. Existing build directory and extension ZIP files are deleted first.')
		.choices('browser', buildTargets)
		.alias('browser', 'b')
		.describe('test-release', 'Build an experimental release, which is flagged as being a test version')
		.boolean('test-release')
		.alias('test-release', 't')
		.describe('release', 'Override release in manifest.json. This should only be used when making test releases.')
		.string('release')
		.nargs('release', 1)
		.alias('release', 'r')
		.describe('clean', "Don't build; just remove existing build directory and ZIP.")
		.boolean('clean')
		.alias('clean', 'c')
		.describe('debug', 'Create a debug build, with console.timeStamp() calls included, which are used in profile recordings.')
		.boolean('debug')
		.alias('debug', 'd')
		.describe('skip-linting', "Don't run linters (if applicable) - makes the build process quicker")
		.boolean('skip-linting')
		.alias('skip-linting', 'L')
		.describe('skip-zipping', "Don't create the zip archive (for when running locally only)")
		.boolean('skip-zipping')
		.alias('skip-zipping', 'Z')
		.demandOption('browser', 'You must specify at least one browser')
		.argv

	if (argv.release) extVersion = argv.release

	const browsers = argv.browser
		? argv.browser === 'all'
			? validBrowsers
			: Array.isArray(argv.browser)
				? argv.browser
				: [argv.browser]
		: null

	const isFullBuild = argv.clean !== true
	const action = isFullBuild ? 'Building' : 'Cleaning'
	console.log(chalk.bold(`${action} ${extName} ${extVersion}...`))
	const debugMode = argv.debug === true
	const debugMsg = debugMode ? ' (debug)' : ''

	testMode = argv.testRelease === true
	const testMsg = testMode ? ' (test)' : ''

	if (!browsers) return

	for (const browser of browsers) {
		console.log()
		logStep(chalk.bold(`${action} for ${browser}${testMsg}${debugMsg}`))
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
			if (!argv.skipZipping) {
				await makeZip(browser)
			}
			if (!argv.skipLinting && browser in linters) {
				await linters[browser](argv.skipZipping)
			}
		}
	}
}


main()
