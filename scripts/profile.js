/* eslint-disable no-prototype-builtins */
'use strict'
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer')
const stats = require('stats-lite')

const urls = Object.freeze({
	abootstrap: 'https://angular-ui.github.io/bootstrap/',
	amazon: 'https://www.amazon.co.uk',
	ars: 'https://arstechnica.com',
	bbcnews: 'https://www.bbc.co.uk/news',
	googledoc: 'https://docs.google.com/document/d/1GPFzG-d47qsD1QjkCCel4-Gol6v34qduFMIhBsGUSTs'
})

const pageSettlingDelay = 2e3


//
// Trace the insertion of landmarks into a page over time
//

function setUpExtensionTrace(sites) {
	const landmarks = checkNumber(process.argv[4], 0, 'landmarks')
	const runs = checkNumber(process.argv[5], 1, 'runs')
	doLandmarkInsertionRuns(sites, landmarks, runs)
}

function doLandmarkInsertionRuns(sites, landmarks, runs) {
	const delayAfterInsertingLandmark = 1e3

	puppeteer.launch({
		headless: false,  // needed to support extensions
		args: [
			'--disable-extensions-except=build/chrome/',
			'--load-extension=build/chrome/'
		]
	}).then(async browser => {
		for (const site of sites) {
			console.log(`Tracing on ${urls[site]}...\n`)
			const page = await browser.newPage()

			for (let run = 0; run < runs; run++) {
				console.log(`Run ${run}`)
				await page.goto(urls[site], { waitUntil: 'domcontentloaded' })
				await page.bringToFront()
				await page.tracing.start({
					path: `trace--${site}--${landmarks}--run${run}.json`,
					screenshots: true
				})
				await settle(page)

				console.log('Adding landmarks stage (if applicable)...')
				for (let repetition = 0; repetition < landmarks; repetition++) {
					console.log(`Repetition ${repetition}`)
					await insertLandmark(page, repetition)
					await page.waitFor(delayAfterInsertingLandmark)
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
// Specific landmarksFinder.find() test
//

function timeLandmarksFinding(sites) {
	const landmarksFinderPath = path.join('scripts', 'generated-landmarks-finder.js')
	const loops = checkNumber(process.argv[4], 1, 'repetitions')
	const results = {}

	console.log(`Runing landmarks loop test on ${sites}...`)
	puppeteer.launch().then(async browser => {
		for (const site of sites) {
			const page = await browser.newPage()
			console.log()
			console.log(`Loading ${urls[site]}...`)
			await page.goto(urls[site], { waitUntil: 'domcontentloaded' })
			await settle(page)
			console.log('Injecting script...')
			await page.addScriptTag({
				path: landmarksFinderPath
			})
			console.log(`Running landmark-finding code ${loops} times...`)
			const durations = await page.evaluate(scanAndTallyDurations, loops)
			results[site] = {
				mean: stats.mean(durations),
				standardDeviation: stats.stdev(durations)
			}
			await page.close()
		}

		await browser.close()
		printAndSaveResults(results, loops)
	})
}

function scanAndTallyDurations(times) {
	const lf = new window.LandmarksFinder(window, document)
	const durations = []
	for (let i = 0; i < times; i++) {
		const start = window.performance.now()
		lf.find()
		const end = window.performance.now()
		durations.push(end - start)
	}
	return durations
}

function printAndSaveResults(results, loops) {
	const rounder = (key, value) =>
		value.toPrecision ? Number(value.toPrecision(2)) : value
	console.log()
	console.log('Done.\nResults (mean time in ms for one landmarks sweep):')
	const resultsJson = JSON.stringify(results, rounder, 2)
	console.log(resultsJson)
	const roughlyNow = new Date()
		.toISOString()
		.replace(/T/, '-')
		.replace(/:\d\d\..+/, '')
		.replace(/:/, '')
	const fileName = `results--${loops}--${roughlyNow}.json`
	fs.writeFileSync(fileName, resultsJson)
	console.log(`${fileName} written to disk.`)
}


//
// Main and support
//

function checkText(text, thing) {
	if (!text) {
		console.error(`No ${thing} given.\n`)
		usageAndExit()
	}
	return text
}

function checkNumber(input, limit, things) {
	const number = Number(input)
	if (isNaN(number) || number < limit) {
		console.error(`Invalid number of ${things} "${input}".\n`)
		usageAndExit()
	}
	return number
}

function checkSite(name) {
	if (!urls.hasOwnProperty(name)) {
		console.error(`Unkown site "${name}".`)
		usageAndExit()
	}
	return name
}

async function settle(page) {
	console.log('Page loaded; settling...')
	await page.waitFor(pageSettlingDelay)
}

function usageAndExit() {
	console.error('Usage: npm run profile -- trace <site> <landmarks> <runs>')
	console.error('           Runs the built extension on a real site and traces for')
	console.error('           performance, whilst inserting a number of landmarks.')
	console.error('               <landmarks> number to insert (there is a pause')
	console.error('                           between each one).')
	console.error('               <runs> number of separate tracing runs to make')
	console.error('                      (recommend setting this to 1 only).')
	console.error('           Remember to run this with a debug build of the extension.\n')
	console.error('or:    npm run profile -- time <site> <repetitions>')
	console.error('           Runs only the code to find landmarks specifically, for')
	console.error('           the number of times specified.\n')
	console.error('Valid <sites>:\n', urls)
	console.error('"all" can be specified to run the profile on each site.\n')
	process.exit(42)
}

function main() {
	const mode = checkText(process.argv[2], 'mode')
	const requestedSite = checkText(process.argv[3], 'site')
	const pages = requestedSite === 'all'
		? Object.keys(urls)
		: [checkSite(requestedSite)]

	switch (mode) {
		case 'trace':
			setUpExtensionTrace(pages)
			break
		case 'time':
			timeLandmarksFinding(pages)
			break
		default:
			console.error(`Unknown mode: ${mode}`)
			usageAndExit()
	}
}

main()
