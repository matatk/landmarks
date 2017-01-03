'use strict'

const path = require('path')
const fse = require('fs-extra')
const chalk = require('chalk')
const svg2png = require('svg2png')

module.exports = function(cacheDir, svgPath) {
	// Initialisation
	const svgModified = fse.statSync(svgPath).mtime
	fse.ensureDirSync(cacheDir)


	// Return the full path to the desired PNG
	function pngPath(size) {
		return path.join(cacheDir, 'landmarks-' + size + '.png')
	}

	// Check if a (PNG) file is newer than the SVG file
	function isOlderThanSvg(pngPath) {
		return fse.statSync(pngPath).mtime < svgModified
	}

	// Check if (PNG) file either doesn't exist or is outdated
	function isPngAbsentOrOutdated(pngPath) {
		return !fse.existsSync(pngPath) || isOlderThanSvg(pngPath)
	}

	// Generate PNG from SVG
	function generatePng(size, outputPath) {
		console.log(chalk.bold.blue(`Generating ${outputPath}...`))
		const svgBuffer = fse.readFileSync(svgPath)
		const pngBuffer = svg2png.sync(svgBuffer, {
			width: size,
			height: size
		})
		fse.writeFileSync(outputPath, pngBuffer)
	}


	// Public API implementation
	return {
		// Get the path for a PNG of a particular size.
		// If it does not exist, or if it is out-of-date, (re-)generate it.
		getPngPath: function(size) {
			const requestedPngPath = pngPath(size)
			if (isPngAbsentOrOutdated(requestedPngPath)) {
				generatePng(size, requestedPngPath)
			} else {
				console.log(chalk.bold.blue(`Using existing ${requestedPngPath}`))
			}
			return requestedPngPath
		}
	}
}
