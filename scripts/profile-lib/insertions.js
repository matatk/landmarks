import puppeteer from 'puppeteer'

import { load, pageSetUp, startTracing } from './utils.js'

const delayAfterInsertingLandmark = 1e3  // Used in the landmarks trace


//
// Trace the insertion of landmarks into a page over time
//

export function doLandmarkInsertionRuns(sites, landmarks, runs, quietness) {
	puppeteer.launch({
		headless: false,  // needed to support extensions
		args: [
			'--disable-extensions-except=build/chrome/',
			'--load-extension=build/chrome/'
		]
	}).then(async browser => {
		for (const site of sites) {
			console.log(`Tracing on ${site}...\n`)
			const page = await pageSetUp(browser, true, quietness)

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


