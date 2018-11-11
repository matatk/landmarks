'use strict'
/* global document */
const puppeteer = require('puppeteer')

const sites = Object.freeze({
	ars: 'https://arstechnica.com',
	bbc: 'https://www.bbc.co.uk/',
	bbcnews: 'https://www.bbc.co.uk/news'
})

const pageSettlingDelay = 4000
const delayAfterInsertingLandmark = 1000

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

function orchestrateBrowser(name, url, loops) {
	puppeteer.launch({
		headless: false,  // needed to support extensions
		args: [
			'--disable-extensions-except=build/chrome/',
			'--load-extension=build/chrome/'
		]
	}).then(async browser => {
		const page = await browser.newPage()

		await page.tracing.start({
			path: `trace-${name}-${loops}.json`,
			screenshots: true
		})

		await page.goto(url, { waitUntil: 'domcontentloaded' })
		await page.bringToFront()

		console.log('Page loaded; settling...')
		await page.waitFor(pageSettlingDelay)

		console.log('Repetition stage (if applicable)...')
		for (let repetition = 0; repetition < loops; repetition++) {
			console.log(`Repetition ${repetition}`)
			await insertLandmark(page, repetition)
			await page.waitFor(delayAfterInsertingLandmark)
		}

		console.log('Stopping...')
		await page.tracing.stop()
		await browser.close()
	})
}

function usageAndExit() {
	console.error('Usage: npm run profile -- <site> <repetitions>')
	console.error('       <repetitions>: extra number of times to scan')
	console.error('Valid sites:\n', sites)
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

	const loops = Number(process.argv[3])
	if (isNaN(loops)) {
		console.error(`Invalid number of repetitions "${process.argv[3]}".`)
		usageAndExit()
	}

	orchestrateBrowser(siteName, siteUrl, loops)
}

main()
