export default class ContrastChecker {
	contrastRatio(hex1: string, hex2: string) {
		const l1 = luminance(transmogrify(sRGB(hexToRGB(hex1))))
		const l2 = luminance(transmogrify(sRGB(hexToRGB(hex2))))
		if (l1 > l2) {
			return contrast(l1, l2)
		}
		return contrast(l2, l1)
	}

	foregroundTextColour(backgroundColour: string, fontSize: number, bold: boolean): LabelFontColour {
		const contrastWhite = this.contrastRatio('#ffffff', backgroundColour)
		const threshold =
			((fontSize >= 18) || (fontSize >= 14 && bold === true)) ? 3 : 4.5

		if (contrastWhite >= threshold) {
			return 'white'
		}
		return 'black'
	}
}

const channelStringPositions = { r: 1, g: 3, b: 5 }

type RGB = typeof channelStringPositions

function hexToRGB(hex: string) {
	const rgb: RGB = { r: 0, g: 0, b: 0 }

	for (const channel of Object.keys(channelStringPositions) as (keyof typeof channelStringPositions)[]) {
		const start = channelStringPositions[channel]
		const end = start + 2
		const chanHex = hex.slice(start, end)
		rgb[channel] = parseInt('0x' + chanHex)
	}

	return rgb
}

function sRGB(rgb: RGB) {
	return {
		r: rgb.r / 255,
		g: rgb.g / 255,
		b: rgb.b / 255
	}
}

function transmogrify(sRGB: RGB) {
	const transmogrified: RGB = { r: 0, g: 0, b: 0 }

	for (const channel of Object.keys(sRGB) as (keyof typeof sRGB)[]) {
		if (sRGB[channel] <= 0.03928) {
			transmogrified[channel] = sRGB[channel] / 12.92
		} else {
			transmogrified[channel] = ((sRGB[channel] + 0.055) / 1.055) ** 2.4
		}
	}

	return transmogrified
}

function luminance(transmogrified: RGB) {
	return 0.2126 * transmogrified.r
		+ 0.7152 * transmogrified.g
		+ 0.0722 * transmogrified.b
}

function contrast(lighter: number, darker: number) {
	return (lighter + 0.05) / (darker + 0.05)
}
