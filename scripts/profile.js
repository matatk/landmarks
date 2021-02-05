'use strict'
const path = require('path')
const fs = require('fs')

const fse = require('fs-extra')
const puppeteer = require('puppeteer')
const rollup = require('rollup')
const stats = require('stats-lite')

const urls = Object.freeze({
	abootstrap: 'https://angular-ui.github.io/bootstrap/',
	amazon: 'https://www.amazon.co.uk',
	ars: 'https://arstechnica.com',
	bbcnews: 'https://www.bbc.co.uk/news',
	googledoc1: 'https://docs.google.com/document/d/\
		1GPFzG-d47qsD1QjkCCel4-Gol6v34qduFMIhBsGUSTs',
	googledoc2: 'https://docs.google.com/document/d/\
		1FvmYUC0S0BkdkR7wZsg0hLdKc_qjGnGahBwwa0CdnHE'
})
const cacheDir = path.join(__dirname, 'profile-cache')
const wrapSourcePath = path.join(
	__dirname, '..', 'src', 'code', 'landmarksFinder.js')
const wrapOutputPath = path.join(cacheDir, 'wrappedLandmarksFinder.js')
const pageSettleDelay = 4e3              // after loading a real page
const guiDelayBeforeTabSwitch = 500      // Avoid clash with 'on install' tab
const delayAfterInsertingLandmark = 1e3  // Used in the landmarks trace

const interactiveElementSelector =
	'a[href], a[tabindex], button, div[tabindex], input, textarea'
const roundTheseKeys = new Set([
	'interactiveElementPercent',
	'navMeanTimeMS',
	'navStandardDeviation',
	'scanMeanTimeMS',
	'scanStandardDeviation'])
const debugBuildNote = 'Remember to run this with a debug build of the extension (i.e. `node scripts/build.js --debug --browser chrome`).'

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

async function doTimeLandmarksFinding(sites, loops) {
	const landmarksFinderPath = await wrapLandmarksFinder()
	const fullResults = { 'meta': { 'loops': loops }, 'results': {} }

	console.log(`Runing landmarks loop test on ${sites}...`)
	puppeteer.launch().then(async browser => {
		for (const site of sites) {
			const page = await pageSetUp(browser, false)
			const results = { 'url': urls[site] }

			console.log()
			console.log(`Loading ${site}...`)
			await load(page, site)

			console.log('Counting elements...')
			Object.assign(results, await page.evaluate(
				elementCounts, interactiveElementSelector))

			console.log('Injecting script...')
			await page.addScriptTag({ path: landmarksFinderPath })

			console.log(`Running landmark-finding code ${loops} times...`)
			const pageResults = await page.evaluate(scanForLandmarks, loops)
			Object.assign(results, {
				'scanMeanTimeMS': stats.mean(pageResults.scanDurations),
				'scanStandardDeviation':
					stats.stdev(pageResults.scanDurations)
			})
			delete pageResults.scanDurations
			Object.assign(results, pageResults)

			console.log(`Running landmark-navigating code ${loops} times...`)
			const navDurations = await page.evaluate(
				navigateLandmarks, loops, interactiveElementSelector)
			Object.assign(results, {
				'navMeanTimeMS': stats.mean(navDurations),
				'navStandardDeviation': stats.stdev(navDurations)
			})

			fullResults['results'][site] = results
			await page.close()
		}

		await browser.close()
		printAndSaveResults(fullResults, loops)
	})
}

async function wrapLandmarksFinder() {
	const inputModified = fs.statSync(wrapSourcePath).mtime
	const outputModified = fs.existsSync(wrapOutputPath)
		? fs.statSync(wrapOutputPath).mtime
		: null

	if (!fs.existsSync(wrapOutputPath) || inputModified > outputModified) {
		console.log('Wrapping and caching', path.basename(wrapSourcePath))
		const bundle = await rollup.rollup({ input: wrapSourcePath })
		await bundle.write({
			file: wrapOutputPath,
			format: 'iife',
			name: 'LandmarksFinder'
		})
	}

	return wrapOutputPath
}

function elementCounts(interactiveElementSelector) {
	const elements = document.querySelectorAll('*').length
	const interactiveElements = document.querySelectorAll(
		interactiveElementSelector).length

	return {
		'numElements': elements,
		'numInteractiveElements': interactiveElements,
		'interactiveElementPercent': (interactiveElements / elements) * 100,
	}
}

function scanForLandmarks(times) {
	const lf = new window.LandmarksFinder(window, document)
	const scanDurations = []

	for (let i = 0; i < times; i++) {
		const start = window.performance.now()
		lf.find()
		const end = window.performance.now()
		scanDurations.push(end - start)
	}

	return {
		'scanDurations': scanDurations,
		'numLandmarks': lf.getNumberOfLandmarks()
	}
}

function navigateLandmarks(times, interactiveElementSelector) {
	const lf = new window.LandmarksFinder(window, document)
	const interactiveElements = document.querySelectorAll(
		interactiveElementSelector)
	const navigationDurations = []

	for (let i = 0; i < times; i++) {
		const element = interactiveElements[
			Math.floor(Math.random() * interactiveElements.length)]
		element.focus()
		const start = window.performance.now()
		lf.getNextLandmarkElementInfo()
		const end = window.performance.now()
		navigationDurations.push(end - start)
	}

	return navigationDurations
}

function rounder(key, value) {
	if (roundTheseKeys.has(key)) {
		return Number(value.toPrecision(2))
	}
	return value
}

function printAndSaveResults(results) {
	console.log()
	console.log('Done.\nResults (times are in milliseconds):')
	const resultsJson = JSON.stringify(results, rounder, 2)
	console.log(resultsJson)
	const roughlyNow = new Date()
		.toISOString()
		.replace(/T/, '-')
		.replace(/:\d\d\..+/, '')
		.replace(/:/, '')
	const fileName = `times--${roughlyNow}.json`
	fs.writeFileSync(fileName, resultsJson)
	console.log(`${fileName} written.`)
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
	const testUrl = 'file://' + path.join(__dirname, '..', 'test', testPage)
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

	const epilogue = `Valid sites:\n${JSON.stringify(urls, null, 2)}\n\n"all" can be specified to run the profile on each site.`

	const argv = require('yargs')
		.option('quiet', {
			alias: 'q',
			type: 'boolean',
			description: "Don't print out browser console and request failed messages (do print errors)"
		})
		.option('really-quiet', {
			alias: 'Q',
			type: 'boolean',
			description: "Don't print out any browser messages"
		})
		.command('trace <site> <landmarks> [runs]', 'Run the built extension on a page and create a performance trace', (yargs) => {
			yargs
				.positional('site', siteParameterDefinition)
				.positional('landmarks', {
					describe: 'number of landmarks to insert (there is a pause between each)',
					type: 'number'
				})
				.coerce('landmarks', function(landmarks) {
					if (landmarks < 0) throw new Error("Can't insert a negative number of landmarks")
					return landmarks
				})
				.positional('runs', {
					describe: 'number of separate tracing runs to make (recommend keeping this at one)',
					type: 'number',
					default: 1
				})
				.coerce('runs', function(runs) {
					if (runs < 1) throw new Error("Can't make less than one run")
					return runs
				})
				.epilogue(epilogue)
		}, () => {
			mode = 'trace'
		})
		.command('time <site> [repetitions]', 'Runs only the LandmarksFinder code on a page', (yargs) => {
			yargs
				.positional('site', siteParameterDefinition)
				.positional('repetitions', {
					describe: 'number of separate tracing repetitions to make',
					type: 'number',
					default: 100
				})
				.coerce('repetitions', function(repetitions) {
					if (repetitions < 1) throw new Error("Can't make less than one run")
					return repetitions
				})
				.epilogue(epilogue)
		}, () => {
			mode = 'time'
		})
		.command('guarding', `Make a trace both with and without triggering mutation guarding. ${debugBuildNote}`, () => {}, () => {
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
			doTimeLandmarksFinding(pages, argv.repetitions)
			break
		case 'guarding':
			doTraceWithAndWithoutGuarding()
	}
}

main()
