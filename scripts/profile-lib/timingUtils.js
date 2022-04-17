import fs from 'fs'
import path from 'path'

import { rollup } from 'rollup'

import { cacheDir, dirname } from './utils.js'

export const htmlResultsTableTemplate = path.join(
	dirname, 'profile-lib', 'table-template.html')

const roundKeysThatEndWith = ['Percent', 'MS', 'Deviation', 'PerPage']


//
// Public
//

export async function wrapLandmarksFinder() {
	const sourcePaths = [
		path.join(dirname, '..', 'src', 'code', 'landmarksFinder.js'),
		path.join(dirname, '..', 'src', 'code', 'landmarksFinderDOMUtils.js')]
	const outputPath = path.join(cacheDir, 'wrappedLandmarksFinder.js')

	const latestInputModified =
		new Date(Math.max(...sourcePaths.map(path => fs.statSync(path).mtime)))
	const outputModified = fs.existsSync(outputPath)
		? fs.statSync(outputPath).mtime
		: null

	if (!fs.existsSync(outputPath) || latestInputModified > outputModified) {
		const main = sourcePaths[0]
		console.log('Wrapping and caching', path.basename(main))
		const bundle = await rollup({ input: main })
		await bundle.write({
			file: outputPath,
			format: 'iife',
			name: 'LandmarksFinder'
		})
		console.log()
	}

	return outputPath
}

export function printAndSaveResults(results, writeFiles) {
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

	if (writeFiles) {
		save(baseName + '.json', resultsJsonString)
		save(baseName + '.html', htmlResults(results))
	} else {
		console.log('Results files NOT written')
	}
}

export function areObjectListsEqual(list1, listA) {
	if (list1.length !== listA.length) {
		console.error('length mismatch:', list1.length, listA.length)
		return false
	}
	for (let i = 0; i < list1.length; i++) {
		const item1 = list1[i]
		const itemA = listA[i]
		for (const [key, value] of Object.entries(item1)) {
			if (itemA[key] !== value) {
				console.error('value mismatch in item', i, '"' + key +
					'" field\n' + value + '\n' + itemA[key])
				return false
			}
		}
	}
	return true
}

export function listDebug(landmarks) {
	return landmarks.map(landmark => landmark.debug).join(', ') +
		' ' + landmarks.length
}


//
// Private
//

function rounder(key, value) {
	if (value === undefined) return '—'
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
