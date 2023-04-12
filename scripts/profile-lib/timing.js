import puppeteer from 'puppeteer'
import stats from 'stats-lite'

import {
	load,
	pageSetUp,
	urls
} from './utils.js'

import {
	areObjectListsEqual,
	listDebug,
	printAndSaveResults,
	wrapLandmarksFinder
} from './timingUtils.js'

import {
	elementCounts,
	landmarkNav,
	landmarkScan,
	mutationSetup,
	mutationTests,
	mutationTestsNeedingLandmarks,
	getAlreadyFoundLandmarks,
	getLandmarksAfterFullScan,
	mutationAfterEach
} from './timingBrowserFuncs.js'

const selectInteractives =
	'a[href], a[tabindex], button, div[tabindex], input, textarea'


//
// Getting landmarksFinder timings directly
//

// To avoid passing around loadsa args, we have an options object containing:
//   loops (int)           -- number of repeated scans and focusings
//   doScan (bool)         -- perform scanning test?
//   doFocus (bool)        -- perform focusing tests?
//   doMutations (bool)    -- perform mutation tests?
//   finderPath (string)   -- path to built script file
//   without (bool)        -- do NOT employ guessing in the Finder?
//   quietness (count)     -- how quiet should we be?
//   noFileWrite (bool)    -- do NOT write results to disk

export async function doTimeLandmarksFinding(sites, loops, doScan, doFocus, doMutations, without, quietness, runtimeMessagesOnly, noFileWrite) {
	const options = { loops, doScan, doFocus, doMutations }
	const finderPath = await wrapLandmarksFinder()
	const findersDevModes = { 'Standard': false, 'Developer': true }
	const fullResults = { 'meta': { 'loops': loops } }

	console.log(`Runing landmarks loop test on ${sites}...`)
	options.useHeuristics = true
	puppeteer.launch().then(async browser => {
		for (const finder in findersDevModes) {
			options.finderPath = finderPath
			options.useDevMode = findersDevModes[finder]
			console.log()
			console.log(`With scanner ${finder}...`)
			fullResults[finder] =
				await timeScannerOnSites(browser, sites, options, runtimeMessagesOnly, quietness)
			if (without) {
				options.useHeuristics = false
				const finderPrettyName = finder + ' (without heuristics)'
				console.log()
				console.log(`With scanner ${finderPrettyName}...`)
				fullResults[finderPrettyName] =
					await timeScannerOnSites(browser, sites, options, runtimeMessagesOnly, quietness)
			}
		}

		await browser.close()
		printAndSaveResults(fullResults, !noFileWrite)
	})
}

async function timeScannerOnSites(browser, sites, options, runtimeMessagesOnly, quietness) {
	const finderResults = {}
	let totalElements = 0
	let totalInteractiveElements = 0
	let totalLandmarks = 0
	const allScanTimes = []
	const allNavForwardTimes = []
	const allNavBackTimes = []
	const allMutationTestNamesTimes = {}

	if (options.doMutations) {
		for (const name of Object.keys(mutationTests)) {
			allMutationTestNamesTimes[name] = []
		}
	}

	for (const site of sites) {
		const { siteResults, siteRawResults } =
			await runScansOnSite(browser, site, runtimeMessagesOnly, quietness, options)

		totalElements += siteResults.numElements
		totalInteractiveElements += siteResults.numInteractiveElements
		totalLandmarks += siteResults.numLandmarks

		if (options.doScan) {
			Array.prototype.push.apply(allScanTimes, siteRawResults.scanTimes)
		}

		if (options.doFocus) {
			Array.prototype.push.apply(
				allNavForwardTimes, siteRawResults.navForwardTimes)
			Array.prototype.push.apply(
				allNavBackTimes, siteRawResults.navBackTimes)
		}

		if (options.doMutations) {
			for (const key in allMutationTestNamesTimes) {
				Array.prototype.push.apply(
					allMutationTestNamesTimes[key],
					siteRawResults.mutationTests[key])
			}
		}

		finderResults[site] = siteResults
	}

	if (sites.length > 1) {
		const combined = {}

		combined.numElements = totalElements
		combined.elementsPerPage = totalElements / sites.length
		combined.numInteractiveElements = totalInteractiveElements
		combined.interactiveElementsPercent =
			(totalInteractiveElements / totalElements) * 100
		combined.numLandmarks = totalLandmarks
		combined.LandmarksPerPage = totalLandmarks / sites.length

		if (options.doScan) {
			combined.scanMeanTimeMS = stats.mean(allScanTimes)
			combined.scanDeviation = stats.stdev(allScanTimes)
		}

		if (options.doFocus) {
			combined.navForwardMeanTimeMS = stats.mean(allNavForwardTimes)
			combined.navForwardDeviation = stats.stdev(allNavForwardTimes)
			combined.navBackMeanTimeMS = stats.mean(allNavBackTimes)
			combined.navBackDeviation = stats.stdev(allNavBackTimes)
		}

		if (options.doMutations) {
			for (const testName in allMutationTestNamesTimes) {
				combined[testName + 'MeanTimeMS'] =
					stats.mean(allMutationTestNamesTimes[testName])
				combined[testName + 'Deviation'] =
					stats.stdev(allMutationTestNamesTimes[testName])
			}
		}

		finderResults['combined'] = combined
	}

	return finderResults
}

async function runScansOnSite(browser, site, runtimeMessagesOnly, quietness, {
	loops, finderPath, doScan, doFocus, doMutations, useHeuristics, useDevMode
}) {
	const page = await pageSetUp(browser, false, runtimeMessagesOnly ? null : quietness)
	const results = { 'url': urls[site] }
	const rawResults = {}

	console.log()
	console.log(`Loading ${site}...`)
	await load(page, site, runtimeMessagesOnly ? quietness : null)

	console.log('Injecting script...')
	await page.addScriptTag({ path: finderPath })

	console.log('Counting elements...')
	Object.assign(results, await page.evaluate(
		elementCounts, selectInteractives, useHeuristics))

	if (doScan) {
		console.log(`Running landmark-finding code ${loops} times...`)
		const scanTimes = await page.evaluate(
			landmarkScan, loops, useHeuristics, useDevMode)
		rawResults.scanTimes = scanTimes
		Object.assign(results, {
			'scanMeanTimeMS': stats.mean(scanTimes),
			'scanDeviation': stats.stdev(scanTimes)
		})
	}

	if (doFocus) {
		console.log(`Running forward-nav code ${loops} times...`)
		const navForwardTimes = await page.evaluate(landmarkNav,
			loops, selectInteractives, 'forward', useHeuristics)
		rawResults.navForwardTimes = navForwardTimes
		Object.assign(results, {
			'navForwardMeanTimeMS': stats.mean(navForwardTimes),
			'navForwardDeviation': stats.stdev(navForwardTimes)
		})

		console.log(`Running Back-nav code ${loops} times...`)
		const navBackTimes = await page.evaluate(landmarkNav,
			loops, selectInteractives, 'back', useHeuristics)
		rawResults.navBackTimes = navBackTimes
		Object.assign(results, {
			'navBackMeanTimeMS': stats.mean(navBackTimes),
			'navBackDeviation': stats.stdev(navBackTimes)
		})
	}

	if (doMutations) {
		rawResults.mutationTests = {}

		console.log(`Running mutation tests ${loops} times...`)
		await page.evaluate(mutationSetup, useHeuristics)
		const landmarks = await page.evaluate(getLandmarksAfterFullScan)

		// NOTE: Doing this here as opposed to in the browser due to having to
		//       wait between mutations.
		for (const [ name, func ] of Object.entries(mutationTests)) {
			const msg = '\t' + name
			if (landmarks.length === 0 && mutationTestsNeedingLandmarks.has(func)) {
				console.log(msg, '(skipping; no landmarks)')
				continue
			} else {
				console.log(msg)
			}

			for (let i = 0; i < loops; i++) {
				if (mutationTestsNeedingLandmarks.has(func)) {
					const index = Math.floor(Math.random() * landmarks.length)
					await page.evaluate(func, index)
				} else {
					await page.evaluate(func, true)  // TODO: needed? so !null
				}

				let mutated
				let reverted

				// Check that a full scan matches the landmarks we found by
				// reacting to the mutation only.
				if (i === 0) {
					mutated = await page.evaluate(getAlreadyFoundLandmarks)
					const full = await page.evaluate(getLandmarksAfterFullScan)
					if (!areObjectListsEqual(full, mutated)) {
						console.log('FULL:', full, 'MUTATED:', mutated)
						console.log(
							'FULL:\n', listDebug(full),
							'\nMUTATED:\n', listDebug(mutated))
						throw Error(
							`Mutated and full scan results differ for ${name}.`)
					}
				}

				await page.evaluate(func, null)  // clean up

				// Check we reverted back OK.  FIXME docs
				//
				// NOTE: The cleanup function re-runs a full scan, so we don't
				//       need to here.
				if (i === 0) {
					reverted = await page.evaluate(getAlreadyFoundLandmarks)
					if (!areObjectListsEqual(landmarks, reverted)) {
						console.log(
							'LANDMARKS:', landmarks,
							'REVERTED:', reverted)
						console.log(
							'LANDMARKS:\n', listDebug(landmarks),
							'\nREVERTED:\n', listDebug(reverted))
						throw Error(`${name} DOM not successfully reverted.`)
					}
				}
			}

			// NOTE: Not all mutations may be grouped, so there could be a
			//       different number of mutations (and thus times) than loops.
			const times = await page.evaluate(mutationAfterEach, useHeuristics)
			rawResults.mutationTests[name] = times
			Object.assign(results, {
				[name + 'MeanTimeMS']: stats.mean(times),
				[name + 'Deviation']: stats.stdev(times)
			})
		}
	}

	await page.close()
	return { 'siteResults': results, 'siteRawResults': rawResults }
}
