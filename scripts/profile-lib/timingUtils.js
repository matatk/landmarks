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

export function printAndSaveResults(results) {
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


//
// Private
//

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
