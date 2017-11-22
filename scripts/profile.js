'use strict'
const puppeteer = require('puppeteer')

puppeteer.launch({
	headless: false,  // needed to support extensions
	args: [
		'--disable-extensions-except=build/chrome/',
		'--load-extension=build/chrome/'
	]
}).then(async browser => {
	const page = await browser.newPage()

	await page.goto('https://www.theverge.com')
	await page.bringToFront()
	await page.tracing.start({path: 'trace.json', screenshots: true})
	await page.waitFor(2000)

	// Find the first category navigation link
	const firstNavLink = await page.$('body > div.l-root.l-reskin > div.l-header > div > div.c-masthead.c-masthead--centered > header > div > nav > ul > li:nth-child(1) > a')
	const box = await firstNavLink.boundingBox()

	const baseXoffset = 20
	const baseYoffset = 20

	// Move the mouse around a lot causing the menus to appear/disappear
	for (let repetition = 0; repetition < 10; repetition++) {
		for (let offset = baseXoffset; offset < 700; offset += 100) {
			await page.mouse.move(box.x + offset, box.y + baseYoffset, {steps: 20})
			await page.waitFor(350)
		}
	}

	await page.tracing.stop()
	await browser.close()
})
