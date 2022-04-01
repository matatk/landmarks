import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

import fse from 'fs-extra'
import puppeteer from 'puppeteer'
import { rollup } from 'rollup'
import stats from 'stats-lite'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const urls = Object.freeze({
	abootstrap: 'https://angular-ui.github.io/bootstrap/',
	amazon: 'https://www.amazon.co.uk',
	amazonproduct: 'https://www.amazon.co.uk/'
		+ 'Ridleys-Corny-Classic-Provide-Laughs/dp/B07DX65CP1',
	ars: 'https://arstechnica.com',
	bbcnews: 'https://www.bbc.co.uk/news',
	bbcnewsarticle: 'https://www.bbc.co.uk/news/technology-53093613',
	bbcnewsstory: 'https://www.bbc.co.uk/news/resources/idt-sh/'
		+ 'dundee_the_city_with_grand_designs',
	googledoc: 'https://docs.google.com/document/d/'
		+ '1FvmYUC0S0BkdkR7wZsg0hLdKc_qjGnGahBwwa0CdnHE',
	wikipediaarticle: 'https://en.wikipedia.org/wiki/Color_blindness'
})

const dirname = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(dirname, 'profile-cache')
const htmlResultsTableTemplate = path.join(dirname, 'table-template.html')

const pageSettleDelay = 4e3              // after loading a real page
const guiDelayBeforeTabSwitch = 500      // Avoid clash with 'on install' tab
const delayAfterInsertingLandmark = 1e3  // Used in the landmarks trace

const selectInteractives =
	'a[href], a[tabindex], button, div[tabindex], input, textarea'
const roundKeysThatEndWith = ['Percent', 'MS', 'Deviation', 'PerPage']
const debugBuildNote =
	'Remember to run this with a debug build of the extension (i.e. '
	+ '`node scripts/build.js --debug --browser chrome`).'

let quiet = false
let reallyQuiet = false


//
// Trace the insertion of landmarks into a page over time
//

function doLandmarkInsertionRuns(sites, landmarks, runs) {
	puppeteer.launch({
		headless: false,  // needed to support extensions
		args: [
			'--disable-extensions-except=build/chrome/',
			'--load-extension=build/chrome/'
		]
	}).then(async browser => {
		for (const site of sites) {
			console.log(`Tracing on ${site}...\n`)
			const page = await pageSetUp(browser, true)

			for (let run = 0; run < runs; run++) {
				console.log(`Run ${run}`)
				const traceName = `trace--${site}--${landmarks}--run${run}.json`
				await load(page, site)
				await startTracing(page, traceName)

				console.log('Adding landmarks stage (if applicable)...')
				for (let repetition = 0; repetition < landmarks; repetition++) {
					console.log(`Repetition ${repetition}`)
					await insertLandmark(page, repetition)
					await page.waitForTimeout(delayAfterInsertingLandmark)
				}

				await page.tracing.stop()
				if (run < runs) console.log()
			}

			await page.close()
		}

		console.log('Done; closing browser...')
		await browser.close()
	})
}

async function insertLandmark(page, repetition) {
	await page.evaluate((step) => {
		const id = `profile-injected-landmark-${step}`

		const textNode = document.createTextNode(`Step: ${step}`)

		const para = document.createElement('p')
		para.setAttribute('id', id)
		para.appendChild(textNode)

		const landmark = document.createElement('section')
		landmark.setAttribute('aria-labelledby', id)
		landmark.appendChild(para)

		document.body.insertBefore(landmark, document.body.firstChild)
	}, repetition)
}


//
// Getting landmarksFinder timings directly
//

// To avoid passing around loadsa args, we have an options object containing:
//   loops (int)           -- number of repeated scans and focusings
//   doScan (bool)         -- perform scanning test?
//   doFocus (bool)        -- perform focusing tests?
//   finderName (string)   -- pretty name
//   finderPath (string)   -- path to built script file
//   without (bool)        -- do NOT employ guessing in the Finder?

async function doTimeLandmarksFinding(sites, loops, doScan, doFocus, without) {
	const finderPath = await wrapLandmarksFinder()

	const finders = {
		'Standard': false,
		'Developer': true
	}

	const fullResults = { 'meta': { 'loops': loops } }

	const options = { loops, doScan, doFocus }
	options.useHeuristics = true

	console.log(`Runing landmarks loop test on ${sites}...`)
	puppeteer.launch().then(async browser => {
		for (const finder in finders) {
			options.finderName = finder
			options.finderPath = finderPath
			options.useDevMode = finders[finder]
			console.log()
			console.log(`With scanner ${finder}...`)
			fullResults[finder] =
				await timeScannerOnSites(browser, sites, options)
			if (without) {
				options.useHeuristics = false
				const finderPrettyName = finder + ' (without heuristics)'
				console.log()
				console.log(`With scanner ${finderPrettyName}...`)
				fullResults[finderPrettyName] =
					await timeScannerOnSites(browser, sites, options)
			}
		}

		await browser.close()
		printAndSaveResults(fullResults, loops)
	})
}

async function timeScannerOnSites(browser, sites, options) {
	const finderResults = {}
	let totalElements = 0
	let totalInteractiveElements = 0
	let totalLandmarks = 0
	const allScanTimes = []
	const allNavForwardTimes = []
	const allNavBackTimes = []

	for (const site of sites) {
		const { siteResults, siteRawResults } =
			await runScansOnSite(browser, site, options)

		totalElements += siteResults.numElements
		totalInteractiveElements += siteResults.numInteractiveElements
		totalLandmarks += siteResults.numLandmarks

		if (options.doScan) {
			Array.prototype.push.apply(allScanTimes, siteRawResults.scanTimes)
		}

		if (options.doFocus) {
			Array.prototype.push.apply(
				allNavForwardTimes, siteRawResults.navForwardTimes)
			Array.prototype.push.apply(
				allNavBackTimes, siteRawResults.navBackTimes)
		}

		finderResults[site] = siteResults
	}

	if (sites.length > 1) {
		const combined = {}

		combined.numElements = totalElements
		combined.elementsPerPage = totalElements / sites.length
		combined.numInteractiveElements = totalInteractiveElements
		combined.interactiveElementsPercent =
			(totalInteractiveElements / totalElements) * 100
		combined.numLandmarks = totalLandmarks
		combined.LandmarksPerPage = totalLandmarks / sites.length

		if (options.doScan) {
			combined.scanMeanTimeMS = stats.mean(allScanTimes)
			combined.scanDeviation = stats.stdev(allScanTimes)
		}

		if (options.doFocus) {
			combined.navForwardMeanTimeMS = stats.mean(allNavForwardTimes)
			combined.navForwardDeviation = stats.stdev(allNavForwardTimes)
			combined.navBackMeanTimeMS = stats.mean(allNavBackTimes)
			combined.navBackDeviation = stats.stdev(allNavBackTimes)
		}

		finderResults['combined'] = combined
	}

	return finderResults
}

async function runScansOnSite(browser, site, {
	loops, finderName, finderPath, doScan, doFocus, useHeuristics, useDevMode
}) {
	const page = await pageSetUp(browser, false)
	const results = { 'url': urls[site] }
	const rawResults = {}

	console.log()
	console.log(`Loading ${site}...`)
	await load(page, site)

	console.log('Injecting script...')
	await page.addScriptTag({ path: finderPath })

	console.log('Counting elements...')
	Object.assign(results, await page.evaluate(
		elementCounts, finderName, selectInteractives, useHeuristics))

	if (doScan) {
		console.log(`Running landmark-finding code ${loops} times...`)
		const scanTimes = await page.evaluate(
			landmarkScan, finderName, loops, useHeuristics, useDevMode)
		rawResults.scanTimes = scanTimes
		Object.assign(results, {
			'scanMeanTimeMS': stats.mean(scanTimes),
			'scanDeviation': stats.stdev(scanTimes)
		})
	}

	if (doFocus) {
		console.log(`Running forward-nav code ${loops} times...`)
		const navForwardTimes = await page.evaluate(landmarkNav,
			finderName, loops, selectInteractives, 'forward', useHeuristics)
		rawResults.navForwardTimes = navForwardTimes
		Object.assign(results, {
			'navForwardMeanTimeMS': stats.mean(navForwardTimes),
			'navForwardDeviation': stats.stdev(navForwardTimes)
		})

		console.log(`Running Back-nav code ${loops} times...`)
		const navBackTimes = await page.evaluate(landmarkNav,
			finderName, loops, selectInteractives, 'back', useHeuristics)
		rawResults.navBackTimes = navBackTimes
		Object.assign(results, {
			'navBackMeanTimeMS': stats.mean(navBackTimes),
			'navBackDeviation': stats.stdev(navBackTimes)
		})
	}

	await page.close()
	return { 'siteResults': results, 'siteRawResults': rawResults }
}

async function wrapLandmarksFinder() {
	const sourcePath = path.join(dirname, '..', 'src', 'code', 'landmarksFinder.js')
	const outputPath = path.join(cacheDir, 'wrappedLandmarksFinder.js')

	const inputModified = fs.statSync(sourcePath).mtime
	const outputModified = fs.existsSync(outputPath)
		? fs.statSync(outputPath).mtime
		: null

	if (!fs.existsSync(outputPath) || inputModified > outputModified) {
		console.log('Wrapping and caching', path.basename(sourcePath))
		const bundle = await rollup({ input: sourcePath })
		await bundle.write({
			file: outputPath,
			format: 'iife',
			name: 'LandmarksFinder'
		})
		console.log()
	}

	return outputPath
}

function elementCounts(objectName, selectInteractives, heuristics) {
	const elements = document.querySelectorAll('*').length
	const interactiveElements = document.querySelectorAll(
		selectInteractives).length

	const lf = new window.LandmarksFinder(window, document, heuristics, false)
	lf.find()

	return {
		'numElements': elements,
		'numInteractiveElements': interactiveElements,
		'interactiveElementsPercent': (interactiveElements / elements) * 100,
		'numLandmarks': lf.getNumberOfLandmarks()
	}
}

function landmarkScan(objectName, times, heuristics, devMode) {
	const lf = new window.LandmarksFinder(window, document, heuristics, devMode)
	const scanTimes = []

	for (let i = 0; i < times; i++) {
		const start = window.performance.now()
		lf.find()
		const end = window.performance.now()
		scanTimes.push(end - start)
	}

	return scanTimes
}

function landmarkNav(objectName, times, selectInteractives, mode, heuristics) {
	const lf = new window.LandmarksFinder(window, document, heuristics, false)
	const interactiveElements = document.querySelectorAll(selectInteractives)
	const navigationTimes = []
	// Tests showed that indirectly calling the navigation function is between
	// 3% and 8% slower than duplicating the code and calling it directly.
	const navigationFunction = mode === 'forward'
		? lf.getNextLandmarkElementInfo
		: mode === 'back'
			? lf.getPreviousLandmarkElementInfo
			: null

	for (let i = 0; i < times; i++) {
		const element = interactiveElements[
			Math.floor(Math.random() * interactiveElements.length)]
		element.focus()
		const start = window.performance.now()
		navigationFunction()
		const end = window.performance.now()
		navigationTimes.push(end - start)
	}

	return navigationTimes
}

function rounder(key, value) {
	for (const ending of roundKeysThatEndWith) {
		if (key.endsWith(ending)) {
			return Number(value.toPrecision(2))
		}
	}
	return value
}

function htmlResults(results) {
	const boilerplate = fs.readFileSync(htmlResultsTableTemplate, 'utf-8')
	const scanners = Object.keys(results).filter(element => element !== 'meta')
	const sites = Object.keys(results[scanners[0]])
	const headers = Object.keys(results[scanners[0]][sites[0]])

	let output = '<thead>\n<tr>\n'
	for (const header of headers) {
		const prettyHeader = header
			.replace(/MS$/, ' ms')
			.replace(/Percent$/, ' %')
			.replace(/([A-Z])/g, ' $1')
			.replace('url', 'URL')
			.replace('num', 'Number of')
			.replace(/^([a-z])/, match => match.toUpperCase())
		output += `<th>${prettyHeader}</th>`
	}
	output += '\n</tr>\n</thead>\n'

	for (const scanner of scanners) {
		output += `<tr><th colspan="${headers.length}">${scanner}</th></tr>\n`
		for (const site of sites) {
			output += '<tr>\n'
			for (const header of headers) {
				if (header === 'url') {
					if (!('url' in results[scanner][site])) {
						output += '<th scope="row">Combined</th>'
					} else {
						const url = results[scanner][site].url
						output += `<th scope="row">${url}</th>`
					}
				} else {
					const roundedResult =
						rounder(header, results[scanner][site][header])
					output += `<td>${roundedResult}</td>`
				}
			}
			output += '\n'
		}
	}

	return boilerplate.replace('CONTENT', output)
}

function save(fileName, string) {
	fs.writeFileSync(fileName, string)
	console.log(`${fileName} written.`)
}

function printAndSaveResults(results) {
	const roughlyNow = new Date()
		.toISOString()
		.replace(/T/, '-')
		.replace(/:\d\d\..+/, '')
		.replace(/:/, '')
	const baseName = `times--${roughlyNow}`

	console.log()
	console.log('Done.\nResults (times are in milliseconds):')
	const resultsJsonString = JSON.stringify(results, rounder, 2)
	console.log(resultsJsonString)

	save(baseName + '.json', resultsJsonString)
	save(baseName + '.html', htmlResults(results))
}


//
// Making a trace to test mutation guarding in the debug extension
//

function doTraceWithAndWithoutGuarding() {
	console.log(`${debugBuildNote}\n`)
	puppeteer.launch({
		headless: false,  // needed to support extensions
		args: [
			'--disable-extensions-except=build/chrome/',
			'--load-extension=build/chrome/'
		]
	}).then(async browser => {
		const page = await pageSetUp(browser, true)
		await singleRun(page, 'trace--no-guarding.json', 600, 0)
		console.log()
		await singleRun(page, 'trace--triggering-guarding.json', 400, 1e3)
		await browser.close()
	})
}

async function singleRun(page, traceName, pauseBetweenClicks, postDelay) {
	const testPage = 'manual-test-injected-landmarks.html'
	const testUrl = 'file://' + path.join(dirname, '..', 'test', testPage)
	const selectors = [ '#outer-injector', '#inner-injector', '#the-cleaner' ]

	console.log(`Making ${traceName}`)
	await goToAndSettle(page, testUrl)
	await startTracing(page, traceName)

	console.log(`Clicking buttons (pause: ${pauseBetweenClicks})`)
	for (const selector of selectors) {
		await page.click(selector)
		await page.waitForTimeout(pauseBetweenClicks)
	}

	console.log(`Waiting for ${postDelay} for page to settle`)
	await page.waitForTimeout(postDelay)

	console.log('Stopping tracing')
	await page.tracing.stop()
}


//
// Main and support
//

async function pageSetUp(browser, gui) {
	const page = await browser.newPage()

	if (!quiet) {
		page.on('console', msg => console.log('>', msg.text()))
		page.on('requestfailed', request => {
			console.log(request.failure().errorText, request.url())
		})
	}
	if (!reallyQuiet) {
		page.on('pageerror', error => {
			console.log(error.message)
		})
	}

	if (gui) {
		await page.waitForTimeout(guiDelayBeforeTabSwitch)
		await page.bringToFront()
	}

	return page
}

async function startTracing(page, traceName) {
	await page.tracing.start({
		path: traceName,
		screenshots: true
	})
	await page.waitForTimeout(500)  // TODO: needed?
}

async function load(page, site) {
	const cachedPage = path.resolve(path.join(cacheDir, site + '.html'))
	const url = urls[site]

	if (fs.existsSync(cachedPage)) {
		console.log(`Using cached ${path.basename(cachedPage)}`)

		await page.setRequestInterception(true)
		page.on('request', request => {
			if (request.url().startsWith('http')) {
				request.abort()
			} else {
				if (!request.url().startsWith('data:')) {
					console.warn(`PERMITTING REQUEST: ${request.url()}`)
				}
				request.continue()
			}
		})

		const html = fs.readFileSync(cachedPage, 'utf8')
		await page.setContent(html)
	} else {
		console.log(`Fetching and caching ${site}`)
		await goToAndSettle(page, url)
		const html = await page.content()
		fs.writeFileSync(cachedPage, html)
	}
}

async function goToAndSettle(page, url) {
	// The 'networkidle2' event should be the end of content loading, but
	// found that on some pages an extra wait was needed, or the number of
	// elements found on the page varied a lot.
	await page.goto(url, { waitUntil: 'networkidle2' })
	console.log('Page loaded; settling...')
	await page.waitForTimeout(pageSettleDelay)
}

function main() {
	let mode

	const siteParameterDefinition = {
		describe: 'sites to scan',
		choices: ['all'].concat(Object.keys(urls))
	}

	const epilogue =
		`Valid sites:\n${JSON.stringify(urls, null, 2)}\n\n`
		+ '"all" can be specified to run the profile on each site.'

	const argv = yargs(hideBin(process.argv))
		.option('quiet', {
			alias: 'q',
			type: 'boolean',
			description:
			"Don't print out browser console and request failed messages "
			+ '(do print errors)'
		})
		.option('really-quiet', {
			alias: 'Q',
			type: 'boolean',
			description:
			"Don't print out any browser messages (except unhandled "
			+ 'exceptions)'
		})
		.command(
			'trace <site> <landmarks> [runs]',
			'Run the built extension on a page and create a performance trace',
			yargs => {
				yargs
					.positional('site', siteParameterDefinition)
					.positional('landmarks', {
						describe:
						'number of landmarks to insert (there is a pause '
						+ 'between each)',
						type: 'number'
					})
					.coerce('landmarks', function(landmarks) {
						if (landmarks < 0) {
							throw new Error(
								"Can't insert a negative number of landmarks")
						}
						return landmarks
					})
					.positional('runs', {
						describe:
						'number of separate tracing runs to make '
						+ '(recommend keeping this at one)',
						type: 'number',
						default: 1
					})
					.coerce('runs', function(runs) {
						if (runs < 1) {
							throw new Error("Can't make less than one run")
						}
						return runs
					})
					.epilogue(epilogue)
			}, () => {
				mode = 'trace'
			})
		.command(
			'time <site> [repetitions]',
			'Runs only the LandmarksFinder code on a page',
			yargs => {
				yargs
					.option('scan', {
						alias: 's',
						type: 'boolean',
						description: 'Time scanning for landmarks'
					})
					.option('focus', {
						alias: 'f',
						type: 'boolean',
						description:
						'Time focusing the next and previous landmark'
					})
					.check(argv => {
						if (argv.scan || argv.focus) {
							return true
						}
						throw new Error(
							'You must request at least one of the timing tests;'
							+ ' check the help for details.')
					})
					.option('without-heuristics-too', {
						alias: 'w',
						type: 'boolean',
						description: 'Time scanning for landmarks _without_ heuristics as well as with heuristics'
					})
					.positional('site', siteParameterDefinition)
					.positional('repetitions', {
						describe:
						'number of separate tracing repetitions to make',
						type: 'number',
						default: 100
					})
					.coerce('repetitions', function(repetitions) {
						if (repetitions < 1) {
							throw new Error("Can't make less than one run")
						}
						return repetitions
					})
					.epilogue(epilogue)
			}, () => {
				mode = 'time'
			})
		.command(
			'guarding',
			'Make a trace both with and without triggering mutation guarding. '
			+ debugBuildNote,
			() => {},
			() => {
				mode = 'guarding'
			})
		.help()
		.alias('help', 'h')
		.demandCommand(1, 'You must specify a command')
		.epilogue(epilogue)
		.argv

	const pages = argv.site === 'all' ? Object.keys(urls) : [argv.site]

	fse.ensureDirSync(cacheDir)
	quiet = argv.reallyQuiet || argv.quiet
	reallyQuiet = argv.reallyQuiet

	switch (mode) {
		case 'trace':
			doLandmarkInsertionRuns(pages, argv.landmarks, argv.runs)
			break
		case 'time':
			doTimeLandmarksFinding(
				pages,
				argv.repetitions,
				argv.scan,
				argv.focus,
				argv.withoutHeuristicsToo)
			break
		case 'guarding':
			doTraceWithAndWithoutGuarding()
	}
}

main()
