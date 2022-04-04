import fs from 'fs'
import path from 'path'

import puppeteer from 'puppeteer'
import { rollup } from 'rollup'
import stats from 'stats-lite'

import {
	cacheDir,
	dirname,
	htmlResultsTableTemplate,
	load,
	pageSetUp,
	urls
} from './utils.js'

const selectInteractives =
	'a[href], a[tabindex], button, div[tabindex], input, textarea'
const roundKeysThatEndWith = ['Percent', 'MS', 'Deviation', 'PerPage']


//
// Getting landmarksFinder timings directly
//

// To avoid passing around loadsa args, we have an options object containing:
//   loops (int)           -- number of repeated scans and focusings
//   doScan (bool)         -- perform scanning test?
//   doFocus (bool)        -- perform focusing tests?
//   finderName (string)   -- pretty name
//   finderPath (string)   -- path to built script file
//   without (bool)        -- do NOT employ guessing in the Finder?
//   quietness (count)     -- how quiet should we be?

export async function doTimeLandmarksFinding(sites, loops, doScan, doFocus, without, quietness) {
	const finderPath = await wrapLandmarksFinder()

	const finders = {
		'Standard': false,
		'Developer': true
	}

	const fullResults = { 'meta': { 'loops': loops } }

	const options = { loops, doScan, doFocus }
	options.useHeuristics = true

	console.log(`Runing landmarks loop test on ${sites}...`)
	puppeteer.launch().then(async browser => {
		for (const finder in finders) {
			options.finderName = finder
			options.finderPath = finderPath
			options.useDevMode = finders[finder]
			console.log()
			console.log(`With scanner ${finder}...`)
			fullResults[finder] =
				await timeScannerOnSites(browser, sites, options, quietness)
			if (without) {
				options.useHeuristics = false
				const finderPrettyName = finder + ' (without heuristics)'
				console.log()
				console.log(`With scanner ${finderPrettyName}...`)
				fullResults[finderPrettyName] =
					await timeScannerOnSites(browser, sites, options, quietness)
			}
		}

		await browser.close()
		printAndSaveResults(fullResults, loops)
	})
}

async function timeScannerOnSites(browser, sites, options, quietness) {
	const finderResults = {}
	let totalElements = 0
	let totalInteractiveElements = 0
	let totalLandmarks = 0
	const allScanTimes = []
	const allNavForwardTimes = []
	const allNavBackTimes = []

	for (const site of sites) {
		const { siteResults, siteRawResults } =
			await runScansOnSite(browser, site, quietness, options)

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

		finderResults['combined'] = combined
	}

	return finderResults
}

async function runScansOnSite(browser, site, quietness, {
	loops, finderName, finderPath, doScan, doFocus, useHeuristics, useDevMode
}) {
	const page = await pageSetUp(browser, false, quietness)
	const results = { 'url': urls[site] }
	const rawResults = {}

	console.log()
	console.log(`Loading ${site}...`)
	await load(page, site)

	console.log('Injecting script...')
	await page.addScriptTag({ path: finderPath })

	console.log('Counting elements...')
	Object.assign(results, await page.evaluate(
		elementCounts, finderName, selectInteractives, useHeuristics))

	if (doScan) {
		console.log(`Running landmark-finding code ${loops} times...`)
		const scanTimes = await page.evaluate(
			landmarkScan, finderName, loops, useHeuristics, useDevMode)
		rawResults.scanTimes = scanTimes
		Object.assign(results, {
			'scanMeanTimeMS': stats.mean(scanTimes),
			'scanDeviation': stats.stdev(scanTimes)
		})
	}

	if (doFocus) {
		console.log(`Running forward-nav code ${loops} times...`)
		const navForwardTimes = await page.evaluate(landmarkNav,
			finderName, loops, selectInteractives, 'forward', useHeuristics)
		rawResults.navForwardTimes = navForwardTimes
		Object.assign(results, {
			'navForwardMeanTimeMS': stats.mean(navForwardTimes),
			'navForwardDeviation': stats.stdev(navForwardTimes)
		})

		console.log(`Running Back-nav code ${loops} times...`)
		const navBackTimes = await page.evaluate(landmarkNav,
			finderName, loops, selectInteractives, 'back', useHeuristics)
		rawResults.navBackTimes = navBackTimes
		Object.assign(results, {
			'navBackMeanTimeMS': stats.mean(navBackTimes),
			'navBackDeviation': stats.stdev(navBackTimes)
		})
	}

	await page.close()
	return { 'siteResults': results, 'siteRawResults': rawResults }
}

async function wrapLandmarksFinder() {
	const sourcePath = path.join(dirname, '..', 'src', 'code', 'landmarksFinder.js')
	const outputPath = path.join(cacheDir, 'wrappedLandmarksFinder.js')

	const inputModified = fs.statSync(sourcePath).mtime
	const outputModified = fs.existsSync(outputPath)
		? fs.statSync(outputPath).mtime
		: null

	if (!fs.existsSync(outputPath) || inputModified > outputModified) {
		console.log('Wrapping and caching', path.basename(sourcePath))
		const bundle = await rollup({ input: sourcePath })
		await bundle.write({
			file: outputPath,
			format: 'iife',
			name: 'LandmarksFinder'
		})
		console.log()
	}

	return outputPath
}

function elementCounts(objectName, selectInteractives, heuristics) {
	const elements = document.querySelectorAll('*').length
	const interactiveElements = document.querySelectorAll(
		selectInteractives).length

	const lf = new window.LandmarksFinder(window, document, heuristics, false)
	lf.find()

	return {
		'numElements': elements,
		'numInteractiveElements': interactiveElements,
		'interactiveElementsPercent': (interactiveElements / elements) * 100,
		'numLandmarks': lf.getNumberOfLandmarks()
	}
}

function landmarkScan(objectName, times, heuristics, devMode) {
	const lf = new window.LandmarksFinder(window, document, heuristics, devMode)
	const scanTimes = []

	for (let i = 0; i < times; i++) {
		const start = window.performance.now()
		lf.find()
		const end = window.performance.now()
		scanTimes.push(end - start)
	}

	return scanTimes
}

function landmarkNav(objectName, times, selectInteractives, mode, heuristics) {
	const lf = new window.LandmarksFinder(window, document, heuristics, false)
	const interactiveElements = document.querySelectorAll(selectInteractives)
	const navigationTimes = []
	// Tests showed that indirectly calling the navigation function is between
	// 3% and 8% slower than duplicating the code and calling it directly.
	const navigationFunction = mode === 'forward'
		? lf.getNextLandmarkElementInfo
		: mode === 'back'
			? lf.getPreviousLandmarkElementInfo
			: null

	for (let i = 0; i < times; i++) {
		const element = interactiveElements[
			Math.floor(Math.random() * interactiveElements.length)]
		element.focus()
		const start = window.performance.now()
		navigationFunction()
		const end = window.performance.now()
		navigationTimes.push(end - start)
	}

	return navigationTimes
}

function rounder(key, value) {
	for (const ending of roundKeysThatEndWith) {
		if (key.endsWith(ending)) {
			return Number(value.toPrecision(2))
		}
	}
	return value
}

function htmlResults(results) {
	const boilerplate = fs.readFileSync(htmlResultsTableTemplate, 'utf-8')
	const scanners = Object.keys(results).filter(element => element !== 'meta')
	const sites = Object.keys(results[scanners[0]])
	const headers = Object.keys(results[scanners[0]][sites[0]])

	let output = '<thead>\n<tr>\n'
	for (const header of headers) {
		const prettyHeader = header
			.replace(/MS$/, ' ms')
			.replace(/Percent$/, ' %')
			.replace(/([A-Z])/g, ' $1')
			.replace('url', 'URL')
			.replace('num', 'Number of')
			.replace(/^([a-z])/, match => match.toUpperCase())
		output += `<th>${prettyHeader}</th>`
	}
	output += '\n</tr>\n</thead>\n'

	for (const scanner of scanners) {
		output += `<tr><th colspan="${headers.length}">${scanner}</th></tr>\n`
		for (const site of sites) {
			output += '<tr>\n'
			for (const header of headers) {
				if (header === 'url') {
					if (!('url' in results[scanner][site])) {
						output += '<th scope="row">Combined</th>'
					} else {
						const url = results[scanner][site].url
						output += `<th scope="row">${url}</th>`
					}
				} else {
					const roundedResult =
						rounder(header, results[scanner][site][header])
					output += `<td>${roundedResult}</td>`
				}
			}
			output += '\n'
		}
	}

	return boilerplate.replace('CONTENT', output)
}

function save(fileName, string) {
	fs.writeFileSync(fileName, string)
	console.log(`${fileName} written.`)
}

function printAndSaveResults(results) {
	const roughlyNow = new Date()
		.toISOString()
		.replace(/T/, '-')
		.replace(/:\d\d\..+/, '')
		.replace(/:/, '')
	const baseName = `times--${roughlyNow}`

	console.log()
	console.log('Done.\nResults (times are in milliseconds):')
	const resultsJsonString = JSON.stringify(results, rounder, 2)
	console.log(resultsJsonString)

	save(baseName + '.json', resultsJsonString)
	save(baseName + '.html', htmlResults(results))
}


