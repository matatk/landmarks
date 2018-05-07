'use strict'
/* exported ContrastChecker */

function ContrastChecker() {
	const channelStringPositions = { r: 1, g: 3, b: 5 }


	//
	// Public API
	//

	this.contrastRatio = function(hex1, hex2) {
		const l1 = luminance(transmogrify(sRGB(hexToRGB(hex1))))
		const l2 = luminance(transmogrify(sRGB(hexToRGB(hex2))))
		if (l1 > l2) {
			return contrast(l1, l2)
		}
		return contrast(l2, l1)
	}

	this.labelTextColour = function(borderColour) {
		const contrastWhite = this.contrastRatio('#ffffff', borderColour)
		if (contrastWhite > 3) {
			return 'white'
		}
		return 'black'
	}


	//
	// Private API
	//

	function hexToRGB(hex) {
		const rgb = {}
		for (const channel in channelStringPositions) {
			const chanHex = hex.substr(channelStringPositions[channel], 2)
			rgb[channel] = parseInt('0x' + chanHex)
		}

		return rgb
	}

	function sRGB(rgb) {
		return {
			r: rgb.r / 255,
			g: rgb.g / 255,
			b: rgb.b / 255
		}
	}

	function transmogrify(sRGB) {
		const transmogrified = {}

		for (const channel in sRGB) {
			if (sRGB[channel] <= 0.03928) {
				transmogrified[channel] = sRGB[channel] / 12.92
			} else {
				transmogrified[channel] = ((sRGB[channel] + 0.055) / 1.055) ** 2.4
			}
		}

		return transmogrified
	}

	function luminance(transmogrified) {
		return 0.2126 * transmogrified.r
			+ 0.7152 * transmogrified.g
			+ 0.0722 * transmogrified.b
	}

	function contrast(lighter, darker) {
		return (lighter + 0.05) / (darker + 0.05)
	}
}
