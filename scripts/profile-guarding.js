'use strict'
// This script opens the manual test injected landmarks region page then
// simulates clicking on the buttons slowly, so as not to trigger the mutation
// guarding, and quickly, so as to trigger the guarding. A trace is made of
// each run, so the guarding behaviour can be checked.
const path = require('path')
const puppeteer = require('puppeteer')

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
	await page.waitFor(500)

	console.log(`Clicking buttons (pause: ${pauseBetweenClicks})`)
	for (const selector of selectors) {
		await page.click(selector)
		await page.waitFor(pauseBetweenClicks)
	}

	console.log(`Waiting for ${postDelay} for page to settle`)
	await page.waitFor(postDelay)

	console.log('Stopping tracing')
	await page.tracing.stop()
}

function main() {
	console.log('Remember to run this with a debug build of the extension.\n')
	puppeteer.launch({
		headless: false,  // needed to support extensions
		args: [
			'--disable-extensions-except=build/chrome/',
			'--load-extension=build/chrome/'
		]
	}).then(async browser => {
		const page = await browser.newPage()
		await singleRun(page, 'trace-no-guarding.json', 600, 0)
		console.log()
		await singleRun(page, 'trace-triggering-guarding.json', 400, 1e3)
		await browser.close()
	})
}

main()
