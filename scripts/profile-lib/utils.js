import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export const urls = Object.freeze({
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

export const dirname = path.dirname(
	path.join(fileURLToPath(import.meta.url), '..'))
export const cacheDir = path.join(dirname, 'profile-cache')
export const htmlResultsTableTemplate = path.join(
	dirname, 'table-template.html')

const pageSettleDelay = 4e3              // after loading a real page
const guiDelayBeforeTabSwitch = 500      // Avoid clash with 'on install' tab

export async function startTracing(page, traceName) {
	await page.tracing.start({
		path: traceName,
		screenshots: true
	})
	await page.waitForTimeout(500)  // TODO: needed?
}

export async function load(page, site) {
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

export async function goToAndSettle(page, url) {
	// The 'networkidle2' event should be the end of content loading, but
	// found that on some pages an extra wait was needed, or the number of
	// elements found on the page varied a lot.
	await page.goto(url, { waitUntil: 'networkidle2' })
	console.log('Page loaded; settling...')
	await page.waitForTimeout(pageSettleDelay)
}

export async function pageSetUp(browser, gui, quietness) {
	const page = await browser.newPage()

	if (quietness < 1) {
		page.on('console', msg => console.log('>', msg.text()))
		page.on('requestfailed', request => {
			console.log(request.failure().errorText, request.url())
		})
	}
	if (quietness < 2) {
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
