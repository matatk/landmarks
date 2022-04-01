import path from 'path'

import puppeteer from 'puppeteer'

import { dirname, goToAndSettle, pageSetUp, startTracing } from './utils.js'


//
// Making a trace to test mutation guarding in the debug extension
//

export function doTraceWithAndWithoutGuarding(quietness, debugBuildNote) {
	console.log(`${debugBuildNote}\n`)
	puppeteer.launch({
		headless: false,  // needed to support extensions
		args: [
			'--disable-extensions-except=build/chrome/',
			'--load-extension=build/chrome/'
		]
	}).then(async browser => {
		const page = await pageSetUp(browser, true, quietness)
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
