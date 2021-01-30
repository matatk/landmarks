'use strict'
const path = require('path')
const fs = require('fs')

const puppeteer = require('puppeteer')
const rollup = require('rollup')
const stats = require('stats-lite')

const urls = Object.freeze({
	abootstrap: 'https://angular-ui.github.io/bootstrap/',
	amazon: 'https://www.amazon.co.uk',
	ars: 'https://arstechnica.com',
	bbcnews: 'https://www.bbc.co.uk/news',
	googledoc: 'https://docs.google.com/document/d/1GPFzG-d47qsD1QjkCCel4-Gol6v34qduFMIhBsGUSTs'
})
const pageSettlingDelay = 2e3
const debugBuildNote = 'Remember to run this with a debug build of the extension (i.e. `node scripts/build.js --debug --browser chrome`).'


//
// Trace the insertion of landmarks into a page over time
//

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
// Specific landmarksFinder test
//

async function wrapLandmarksFinder() {
	const inputPath = path.join('src', 'code', 'landmarksFinder.js')
	const outputPath = path.join('scripts', 'wrappedLandmarksFinder.js')

	const inputModified = fs.statSync(inputPath).mtime
	const outputModified = fs.existsSync(outputPath)
		? fs.statSync(outputPath).mtime
		: null

	if (!fs.existsSync(outputPath) || inputModified > outputModified) {
		console.log('Rolluping', inputPath, 'to', outputPath)
		const bundle = await rollup.rollup({ input: inputPath })
		await bundle.write({
			file: outputPath,
			format: 'cjs',
			exports: 'default'
		})
	}

	return outputPath
}

async function timeLandmarksFinding(sites, loops) {
	const landmarksFinderPath = await wrapLandmarksFinder()
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
				url: urls[site],
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
	const fileName = `times--${loops}--${roughlyNow}.json`
	fs.writeFileSync(fileName, resultsJson)
	console.log(`${fileName} written.`)
}


//
// Making a trace to test mutation guarding in the debug extension
//

async function singleRun(page, traceName, pauseBetweenClicks, postDelay) {
	const testPage = 'manual-test-injected-landmarks.html'
	const testUrl = 'file://' + path.join(__dirname, '..', 'test', testPage)
	const selectors = [ '#outer-injector', '#inner-injector', '#the-cleaner' ]

	console.log(`Making ${traceName}`)
	await page.goto(testUrl, { waitUntil: 'domcontentloaded' })
	await page.bringToFront()
	await page.tracing.start({
		path: traceName,
		screenshots: true
	})
	await page.waitForTimeout(500)

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

function traceWithAndWithoutGuarding() {
	console.log(`${debugBuildNote}\n`)
	puppeteer.launch({
		headless: false,  // needed to support extensions
		args: [
			'--disable-extensions-except=build/chrome/',
			'--load-extension=build/chrome/'
		]
	}).then(async browser => {
		const page = await browser.newPage()
		await page.bringToFront()  // stops it getting stuck on Landmarks help
		await singleRun(page, 'trace--no-guarding.json', 600, 0)
		console.log()
		await singleRun(page, 'trace--triggering-guarding.json', 400, 1e3)
		await browser.close()
	})
}


//
// Main and support
//

async function settle(page) {
	console.log('Page loaded; settling...')
	await page.waitForTimeout(pageSettlingDelay)
}

function main() {
	let mode

	const siteParameterDefinition = {
		describe: 'sites to scan',
		choices: ['all'].concat(Object.keys(urls))
	}

	const epilogue = `Valid sites:\n${JSON.stringify(urls, null, 2)}\n\n"all" can be specified to run the profile on each site.`

	const argv = require('yargs')
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

	switch (mode) {
		case 'trace':
			doLandmarkInsertionRuns(pages, argv.landmarks, argv.runs)
			break
		case 'time':
			timeLandmarksFinding(pages, argv.repetitions)
			break
		case 'guarding':
			traceWithAndWithoutGuarding()
	}
}

main()
