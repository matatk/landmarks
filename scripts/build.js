'use strict'
const path = require('path')
const fse = require('fs-extra')
const chalk = require('chalk')
const merge = require('deepmerge')
const archiver = require('archiver')
const oneSvgToManySizedPngs = require('one-svg-to-many-sized-pngs')
const packageJson = require(path.join('..', 'package.json'))
// For restoring pre-2.0.0 deepmerge behaviour...
const isMergeableObject = require('is-mergeable-object')
const emptyTarget = value => Array.isArray(value) ? [] : {}
const clone = (value, options) => merge(emptyTarget(value), value, options)

const extName = packageJson.name
const extVersion = packageJson.version
const buildDir = 'build'
const srcStaticDir = path.join('src', 'static')
const srcAssembleDir = path.join('src', 'assemble')
const svgPath = path.join(srcAssembleDir, 'landmarks.svg')
const pngCacheDir = path.join(buildDir, 'png-cache')

const validBrowsers = Object.freeze([
	'firefox',
	'chrome',
	'opera',
	'edge'
])
const buildModes = Object.freeze(validBrowsers.concat(['all']))

const browserPngSizes = Object.freeze({
	'firefox': [
		18,  // Firefox (toolbar)
		32,  // Firefox (menu panel) + Chrome (Windows)
		36,  // Firefox (toolbar x2)
		48,  // Both    (general)
		64,  // Firefox (menu panel x2)
		96   // Firefox (general x2)
	],
	'chrome': [
		16,  // Chrome  (favicon)
		19,  // Chrome  (toolbar)
		32,  // Chrome  (Windows) + Firefox (menu panel)
		38,  // Chrome  (tooblar x2)
		48,  // Both    (general)
		128  // Chrome  (store)
	],
	'opera': [
		// https://dev.opera.com/extensions/manifest/#icons
		// https://dev.opera.com/extensions/browser-actions/
		16,   // Icon
		19,   // Browser action
		38,   // Browser action
		48,   // Icon
		128,  // Icon
	],
	'edge': [
		// https://docs.microsoft.com/en-us/microsoft-edge/extensions/guides/design
		20,  // Normal browser action
		40,  // 2x browser action
		24,  // Management UI
		48,  // 2x Management UI
		44,  // Windows UI (App List, Settings -> System -> Apps & features
		50,  // Packaging requirement (not visible anywhere)
		150  // Icon for Windows Store
	]
})

const linters = Object.freeze({
	'firefox': lintFirefox
})


function error(message) {
	console.error(chalk.bold.red('✖ ' + message))
	process.exit(42)
}


// Log the start of a new step (styled)
function logStep(name) {
	console.log(chalk.underline(name))
}


// Check we got only one argument and it's valid; return list of builds to make
function checkBuildMode() {
	const args = process.argv.slice(2)

	if (args.length !== 1 || buildModes.indexOf(args[0]) === -1) {
		error(`Invalid build mode requested: expected one of [${buildModes}] but received '${args}'`)
	}

	if (args[0] === 'all') {
		return validBrowsers
	}

	return args
}


// Return path for extension in build folder
function pathToBuild(browser) {
	if (validBrowsers.indexOf(browser) !== -1) {
		return path.join(buildDir, browser)
	}

	error(`pathToBuild: invalid browser ${browser} given`)
}


function copyStaticFiles(browser) {
	logStep('Copying static files...')
	fse.copySync(srcStaticDir, pathToBuild(browser))
}


function copySpecialPagesFile(browser) {
	logStep(`Copying special pages file for ${browser}...`)
	fse.copySync(
		path.join(srcAssembleDir, `specialPages.${browser}.js`),
		path.join(pathToBuild(browser), 'specialPages.js'))
}


function mergeManifest(browser) {
	logStep('Merging manifest.json...')
	const common = path.join('..', srcAssembleDir, 'manifest.common.json')
	const extra = path.join('..', srcAssembleDir, `manifest.${browser}.json`)
	const commonJson = require(common)
	const extraJson = require(extra)

	function oldArrayMerge(target, source, optionsArgument) {
		const destination = target.slice()

		source.forEach(function(e, i) {
			if (typeof destination[i] === 'undefined') {
				const cloneRequested = !optionsArgument || optionsArgument.clone !== false
				const shouldClone = cloneRequested && isMergeableObject(e)
				destination[i] = shouldClone ? clone(e, optionsArgument) : e
			} else if (isMergeableObject(e)) {
				destination[i] = merge(target[i], e, optionsArgument)
			} else if (target.indexOf(e) === -1) {
				destination.push(e)
			}
		})
		return destination
	}

	// Merging this way 'round just happens to make it so that, when merging
	// the arrays of scripts to include, the compatibility one comes first.
	const merged = merge(extraJson, commonJson, { arrayMerge: oldArrayMerge })
	merged.version = extVersion
	fse.writeFileSync(
		path.join(pathToBuild(browser), 'manifest.json'),
		JSON.stringify(merged, null, 2)
	)

	console.log(chalk.green(`✔ manifest.json written for ${browser}.`))
}


function copyCompatibilityShimAndContentScriptInjector(browser) {
	if (browser !== 'firefox') {
		const variant = browser === 'edge' ? browser : 'chrome-opera'
		logStep('Copying browser API compatibility shim...')
		fse.copySync(
			path.join(srcAssembleDir, `compatibility.${variant}.js`),
			path.join(pathToBuild(browser), 'compatibility.js'))

		logStep('Copying content script injector...')
		fse.copySync(
			path.join(srcAssembleDir, 'injector.js'),
			path.join(pathToBuild(browser), 'injector.js'))
	}
}


// Get PNG files from the cache (which will generate them if needed)
function getPngs(converter, browser) {
	logStep('Generating/copying in PNG files...')
	browserPngSizes[browser].forEach((size) => {
		const pngPath = converter.getPngPath(size)
		const basename = path.basename(pngPath)
		fse.copySync(pngPath, path.join(pathToBuild(browser), basename))
	})
}


function zipFileName(browser) {
	return extName + '-' + extVersion + '-' + browser + '.zip'
}


function makeZip(browser) {
	logStep('Createing ZIP file...')
	const outputFileName = zipFileName(browser)
	const output = fse.createWriteStream(outputFileName)
	const archive = archiver('zip')

	output.on('close', function() {
		console.log(chalk.green('✔ ' + archive.pointer() + ' total bytes for ' + outputFileName))
		lint(browser)
	})

	archive.on('error', function(err) {
		throw err
	})

	archive.pipe(output)
	archive.directory(pathToBuild(browser), '')
	archive.finalize()
}


function lint(browser) {
	if (browser in linters) {
		linters[browser]()
	}
}


function lintFirefox() {
	const linter = require('addons-linter').createInstance({
		config: {
			_: [zipFileName('firefox')],
			logLevel: process.env.VERBOSE ? 'debug' : 'fatal',
		}
	})

	linter.run().catch((err) => {
		console.error(err)
	})
}


function copyESLintRC() {
	logStep('Copying src ESLint config to build directory...')
	const basename = '.eslintrc.json'
	fse.copySync(
		path.join('src', basename),
		path.join('build', basename))
}


// Overall build process
console.log(chalk.bold(`Builing ${extName} ${extVersion}...`))
const browsers = checkBuildMode()
const sp = oneSvgToManySizedPngs(pngCacheDir, svgPath)

browsers.forEach((browser) => {
	console.log()
	logStep(chalk.bold(`Building for ${browser}...`))

	copyStaticFiles(browser)
	copySpecialPagesFile(browser)
	mergeManifest(browser)
	copyCompatibilityShimAndContentScriptInjector(browser)
	getPngs(sp, browser)
	makeZip(browser)
})

copyESLintRC()
