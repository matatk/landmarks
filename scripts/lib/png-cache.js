'use strict'

const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const svg2png = require('svg2png')

module.exports = function(cacheDir, svgPath) {
	// Return the full path to the desired PNG
	function pngPath(size) {
		return path.join(cacheDir, 'landmarks-' + size + '.png')
	}

	// Check if a (PNG) file is newer than the SVG file
	function isOlderThanSvg(pngPath) {
		return fs.statSync(pngPath).mtime < svgModified
	}

	// Check if (PNG) file either doesn't exist or is outdated
	function isPngAbsentOrOutdated(pngPath) {
		return !fs.existsSync(pngPath) || isOlderThanSvg(pngPath)
	}

	// Generate PNG from SVG
	function generatePng(size, outputPath) {
		console.log(chalk.bold.blue(`Generating ${outputPath}...`))
		const svgBuffer = fs.readFileSync(svgPath)
		const pngBuffer = svg2png.sync(svgBuffer, {
			width: size,
			height: size
		})
		fs.writeFileSync(outputPath, pngBuffer)
	}


	// Initialisation
	const svgModified = fs.statSync(svgPath).mtime

	if (!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir)
	}

	return {
		getPngPath: function(size) {
			const requestedPngPath = pngPath(size)
			if (isPngAbsentOrOutdated(requestedPngPath)) {
				generatePng(size, requestedPngPath)
			} else {
				console.log(chalk.bold.blue(`${requestedPngPath} already exists`))
			}
			return requestedPngPath
		}
	}
}
