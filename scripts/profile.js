'use strict'
/* global document */
const puppeteer = require('puppeteer')

const sites = Object.freeze({
	abootstrap: 'https://angular-ui.github.io/bootstrap/',  // lots of mutations
	ars: 'https://arstechnica.com',                         // lots of mutations
	bbc: 'https://www.bbc.co.uk/',                          // neat intervals
	bbcnews: 'https://www.bbc.co.uk/news',                  // neat intervals
	googledoc: 'https://docs.google.com/document/d/1GPFzG-d47qsD1QjkCCel4-Gol6v34qduFMIhBsGUSTs'                                            // neat intervals
})

const pageSettlingDelay = 4e3
const delayAfterInsertingLandmark = 1e3

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

function orchestrateBrowser(name, url, landmarks, runs) {
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

function usageAndExit() {
	console.error('Usage: npm run profile -- <site> <landmarks> <runs>')
	console.error('       <landmarks> to insert, with a pause between each.')
	console.error('       <runs> number of separate tracing runs to make.')
	console.error('Valid <sites>:\n', sites)
	process.exit(42)
}

function main() {
	const siteName = process.argv[2]
	if (!siteName) usageAndExit()

	const siteUrl = sites[siteName]
	if (!siteUrl) {
		console.error(`Unkown site "${siteName}".`)
		usageAndExit()
	}

	const landmarks = Number(process.argv[3])
	if (isNaN(landmarks) || landmarks < 0) {
		console.error(`Invalid number of landmarks "${process.argv[3]}".`)
		usageAndExit()
	}

	const runs = Number(process.argv[4])
	if (isNaN(runs) || runs < 1) {
		console.error(`Invalid number of runs "${process.argv[4]}".`)
		usageAndExit()
	}

	orchestrateBrowser(siteName, siteUrl, landmarks, runs)
}

main()
