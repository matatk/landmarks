'use strict'
/* global window document */
const path = require('path')
const puppeteer = require('puppeteer')

const sites = Object.freeze({
	abootstrap: 'https://angular-ui.github.io/bootstrap/',
	ars: 'https://arstechnica.com',
	bbc: 'https://www.bbc.co.uk/',
	bbcnews: 'https://www.bbc.co.uk/news',
	googledoc: 'https://docs.google.com/document/d/1GPFzG-d47qsD1QjkCCel4-Gol6v34qduFMIhBsGUSTs'
})

const pageSettlingDelay = 2e3


//
// Inserting landmarks into a page over time
//

function setUpLandmarkRuns(siteName, siteUrl) {
	// FIXME DRY
	const landmarks = Number(process.argv[4])
	if (isNaN(landmarks) || landmarks < 0) {
		console.error(`Invalid number of landmarks "${process.argv[4]}".`)
		usageAndExit()
	}

	const runs = Number(process.argv[5])
	if (isNaN(runs) || runs < 1) {
		console.error(`Invalid number of runs "${process.argv[5]}".`)
		usageAndExit()
	}

	doLandmarkInsertionRuns(siteName, siteUrl, landmarks, runs)
}

function doLandmarkInsertionRuns(name, url, landmarks, runs) {
	const delayAfterInsertingLandmark = 1e3

	puppeteer.launch({
		headless: false,  // needed to support extensions
		args: [
			'--disable-extensions-except=build/chrome/',
			'--load-extension=build/chrome/'
		]
	}).then(async browser => {
		const page = await browser.newPage()

		for (let run = 0; run < runs; run++) {
			console.log(`Run ${run}`)
			await page.goto(url, { waitUntil: 'domcontentloaded' })
			await page.bringToFront()
			await page.tracing.start({
				path: `trace-${name}-${landmarks}-run${run}.json`,
				screenshots: true
			})

			console.log('Page loaded; settling...')
			await page.waitFor(pageSettlingDelay)

			console.log('Adding landmarks stage (if applicable)...')
			for (let repetition = 0; repetition < landmarks; repetition++) {
				console.log(`Repetition ${repetition}`)
				await insertLandmark(page, repetition)
				await page.waitFor(delayAfterInsertingLandmark)
			}

			await page.tracing.stop()
			if (run < runs) console.log()
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

function profileSpecific(siteName, siteUrl) {
	const landmarksFinderPath = path.join('scripts', 'browser-landmarks.js')

	// FIXME DRY
	const loops = Number(process.argv[4])
	if (isNaN(loops) || loops < 1) {
		console.error(`Invalid number of repetitions "${process.argv[4]}".`)
		usageAndExit()
	}

	console.log(`Runing landmarks loop test on ${siteName}...`)
	console.log(`URL: ${siteUrl}`)
	puppeteer.launch().then(async browser => {
		const page = await browser.newPage()
		console.log('Loading page...')
		await page.goto(siteUrl, { waitUntil: 'domcontentloaded' })
		console.log('Page loaded; settling...')  // TODO DRY?
		await page.waitFor(pageSettlingDelay)
		console.log('Injecting script...')
		await page.addScriptTag({
			path: landmarksFinderPath
		})

		page.on('console', msg => console.log(msg.text()))

		console.log('Running loops...')
		const duration = await page.evaluate(repetitions => {
			let totalDuration = 0
			for (let i = 0; i < repetitions; i++) {
				console.log(`Loop ${i}`)
				const lf = new window.LandmarksFinder(window, document)
				const start = window.performance.now()
				lf.find()
				const end = window.performance.now()
				totalDuration += (end - start)
			}
			return totalDuration
		}, loops)

		console.log()
		console.log('Duration:', duration)
		console.log('Loops:', loops)
		console.log('Mean:', duration / loops)
		await browser.close()
		console.log('Done.')
	})
}


//
// Main gubbins
//

function usageAndExit() {
	console.error('Usage: npm run profile -- trace <site> <landmarks> <runs>')
	console.error('           Runs the built extension on a real site and traces for')
	console.error('           performance, whilst inserting a number of landmarks.')
	console.error('or:    npm run profile -- time <site> <repetitions>')
	console.error('           Runs only the code to find landmarks specifically, for')
	console.error('           the number of times specified.')
	console.error('Valid <sites>:\n', sites)
	process.exit(42)
}

function main() {
	const mode = process.argv[2]
	if (!mode) {
		console.error('No mode given.')
		usageAndExit()
	}

	const siteName = process.argv[3]
	if (!siteName) {
		console.error('No site given.')
		usageAndExit()
	}

	const siteUrl = sites[siteName]
	if (!siteUrl) {
		console.error(`Unkown site "${siteName}".`)
		usageAndExit()
	}

	switch (mode) {
		case 'trace':
			setUpLandmarkRuns(siteName, siteUrl)
			break
		case 'time':
			profileSpecific(siteName, siteUrl)
			break
		default:
			console.error(`Unknown mode: ${mode}`)
			usageAndExit()
	}
}

main()
