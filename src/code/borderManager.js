import landmarkName from './landmarkName'
import ContrastChecker from './contrastChecker'
import { defaultBorderSettings } from './defaults'

// FIXME document and window -> doc and win
export default function BorderManager() {
	const contrastChecker = new ContrastChecker()
	const borderWidthPx = 4

	const borderedElements = new Map()
	let borderColour = defaultBorderSettings.borderColour      // cached locally
	let borderFontSize = defaultBorderSettings.borderFontSize  // cached locally
	let labelFontColour = null  // computed based on border colour
	let justMadeChanges = false


	//
	// Window resize handling
	//

	function resizeHandler() {
		for (const [element, related] of borderedElements) {
			sizeBorderAndLabel(element, related.border, related.label)
		}
	}

	window.addEventListener('resize', resizeHandler)


	//
	// Options handling
	//

	// Take a local copy of relevant options at the start (this means that
	// 'gets' of options don't need to be done asynchronously in the rest of
	// the code).  This also computes the initial label font colour (as it
	// depends on the border colour, which forms the label's background).
	browser.storage.sync.get(defaultBorderSettings, function(items) {
		borderColour = items['borderColour']
		borderFontSize = items['borderFontSize']
		updateLabelFontColour()
	})

	browser.storage.onChanged.addListener(function(changes) {
		let needUpdate = false
		if ('borderColour' in changes) {
			borderColour = changes.borderColour.newValue
			needUpdate = true
		}
		if ('borderFontSize' in changes) {
			borderFontSize = changes.borderFontSize.newValue
			needUpdate = true
		}
		if (needUpdate) {
			updateLabelFontColour()
			redrawBordersAndLabels()
		}
	})


	//
	// Public API
	//

	// Add the landmark border and label for an element Takes an element info
	// object, as returned by the various LandmarksFinder functions.
	//
	// { element: HTMLElement, role: <string>, label: <string> }
	this.addBorder = function(elementInfo) {
		if (!borderedElements.has(elementInfo.element)) {  // FIXME pers - togg
			drawBorderAndLabel(
				elementInfo.element,
				landmarkName(elementInfo),
				borderColour,
				labelFontColour,  // computed as a result of settings
				borderFontSize)
		}
	}

	// Attempt to remove border from an element.
	function removeBorderOn(element) {
		if (borderedElements.has(element)) {
			deleteBorderAndLabelDivs(element)
			borderedElements.delete(element)
		}
	}
	this.removeBorderOn = removeBorderOn

	// Did we just make changes to a border? If so, report this, so that the
	// mutation observer can ignore it.
	this.didJustMakeChanges = function() {
		const didChanges = justMadeChanges
		justMadeChanges = false
		return didChanges
	}

	// In case it's detected that an element may've moved due to mutations
	this.runReszieHandlers = function() {
		resizeHandler()
	}


	//
	// Private API
	//

	// Create an element on the page to act as a border for the element to be
	// highlighted, and a label for it; position and style them appropriately
	function drawBorderAndLabel(element, label, colour, fontColour, fontSize) {
		const zIndex = 10000000

		const labelContent = document.createTextNode(label)

		const borderDiv = document.createElement('div')
		borderDiv.style.border = borderWidthPx + 'px solid ' + colour
		borderDiv.style.boxSizing = 'border-box'
		borderDiv.style.margin = '0'
		borderDiv.style.padding = '0'
		// Pass events through - https://stackoverflow.com/a/6441884/1485308
		borderDiv.style.pointerEvents = 'none'
		borderDiv.style.position = 'absolute'
		borderDiv.style.zIndex = zIndex

		const labelDiv = document.createElement('div')
		labelDiv.style.backgroundColor = colour
		labelDiv.style.border = 'none'
		labelDiv.style.boxSizing = 'border-box'
		labelDiv.style.color = fontColour
		labelDiv.style.display = 'inline-block'
		labelDiv.style.fontFamily = 'sans-serif'
		labelDiv.style.fontSize = fontSize + 'px'
		labelDiv.style.fontWeight = 'bold'
		labelDiv.style.margin = '0'
		labelDiv.style.paddingBottom = '0.25em'
		labelDiv.style.paddingLeft = '0.75em'
		labelDiv.style.paddingRight = '0.75em'
		labelDiv.style.paddingTop = '0.25em'
		labelDiv.style.position = 'absolute'
		labelDiv.style.whiteSpace = 'nowrap'
		labelDiv.style.zIndex = zIndex

		labelDiv.appendChild(labelContent)

		document.body.appendChild(borderDiv)
		document.body.appendChild(labelDiv)
		justMadeChanges = true  // seems to be covered by sizeBorderAndLabel()
		sizeBorderAndLabel(element, borderDiv, labelDiv)

		borderedElements.set(element, { border: borderDiv, label: labelDiv })
	}

	// Given an element on the page and elements acting as the border and
	// label, size the border, and position the label, appropriately for the
	// element
	function sizeBorderAndLabel(element, border, label) {
		const elementBounds = element.getBoundingClientRect()
		const elementTopEdgeStyle = window.scrollY + elementBounds.top + 'px'
		const elementLeftEdgeStyle = window.scrollX + elementBounds.left + 'px'
		const elementRightEdgeStyle = document.documentElement.clientWidth -
			(window.scrollX + elementBounds.right) + 'px'

		border.style.left = elementLeftEdgeStyle
		border.style.top = elementTopEdgeStyle
		border.style.width = elementBounds.width + 'px'
		border.style.height = elementBounds.height + 'px'

		// Try aligning the right edge of the label to the right edge of the
		// border.
		//
		// If the label would go off-screen left, align the left edge of the
		// label to the left edge of the border.

		label.style.removeProperty('left')  // in case this was set before

		label.style.top = elementTopEdgeStyle
		label.style.right = elementRightEdgeStyle

		// Is part of the label off-screen?
		const labelBounds = label.getBoundingClientRect()
		if (labelBounds.left < 0) {
			label.style.removeProperty('right')
			label.style.left = elementLeftEdgeStyle
		}

		justMadeChanges = true  // seems to be in the right place
	}

	// Remove known-existing DOM nodes for the border and label
	// Note: does not remove the record of the element, so as to avoid an
	//       infinite loop when redrawing borders.
	function deleteBorderAndLabelDivs(element) {
		const related = borderedElements.get(element)
		related.border.remove()
		related.label.remove()
		justMadeChanges = true
	}

	// Work out if the label font colour should be black or white
	function updateLabelFontColour() {
		labelFontColour = contrastChecker.foregroundTextColour(
			borderColour,
			borderFontSize,
			true)  // the font is always bold
	}

	function redrawBordersAndLabels() {
		for (const [element, related] of borderedElements) {
			const labelText = related.label.innerText
			deleteBorderAndLabelDivs(element)
			drawBorderAndLabel(
				element,
				labelText,
				borderColour,
				labelFontColour,  // computed as a result of settings
				borderFontSize)
		}
	}
}
