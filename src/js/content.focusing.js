import landmarkName from './landmarkName.js'
import { defaultBorderSettings } from './defaults.js'
import ContrastChecker from './contrast.js'

export default function() {
	const contrastChecker = new ContrastChecker()

	const momentaryBorderTime = 2000
	const borderWidthPx = 4

	const settings = {}         // caches options locally (simpler drawing code)
	let labelFontColour = null  // computed based on border colour

	// Keep a reference to the current element, its role and name for redraws
	let currentlyFocusedElementInfo = null

	// Drawn border elements: the first is used as a convenient indicator that
	// the border is drawn. They are both needed when resizing/repositioning
	// the border/label.
	let currentBorderElement = null
	let currentLabelElement = null

	let currentResizeHandler = null  // tracked so it can be removed
	let borderRemovalTimer = null    // tracked so it can be cleared
	let justMadeChanges = false      // we are asked this by mutation observer


	//
	// Options-handling
	//

	// Take a local copy of all options at the start (this means that 'gets' of
	// options don't need to be done asynchronously in the rest of the code).
	// This also computes the initial label font colour (as it depends on the
	// border colour, which forms the label's background).
	browser.storage.sync.get(defaultBorderSettings, function(items) {
		for (const option in items) {
			settings[option] = items[option]
		}
		updateLabelFontColour()
	})

	browser.storage.onChanged.addListener(function(changes) {
		for (const option in changes) {
			if (settings.hasOwnProperty(option)) {
				settings[option] = changes[option].newValue
			}
		}

		if ('borderColour' in changes || 'borderFontSize' in changes) {
			updateLabelFontColour()
			redrawBorderAndLabel()
		}

		if ('borderType' in changes) {
			borderTypeChange()
		}
	})


	//
	// Public API
	//

	// Set focus on the selected landmark element. It takes an element info
	// object, as returned by the various LandmarksFinder functions.
	//
	// { element: HTMLElement, role: <string>, label: <string> }
	//
	// Note: this should only be called if landmarks were found. The check
	//       for this is done in the main content script, as it involves UI
	//       activity, and couples finding and focusing.
	this.focusElement = function(elementInfo) {
		removeBorderOnCurrentlySelectedElement()

		// Ensure that the element is focusable
		const originalTabindex = elementInfo.element.getAttribute('tabindex')
		if (originalTabindex === null || originalTabindex === '0') {
			elementInfo.element.setAttribute('tabindex', '-1')
		}

		elementInfo.element.scrollIntoView()  // always go to the top of it
		elementInfo.element.focus()

		// Add the border and set a borderRemovalTimer to remove it (if
		// required by user settings)
		if (settings.borderType !== 'none') {
			addBorder(elementInfo)

			if (settings.borderType === 'momentary') {
				if (borderRemovalTimer) {
					clearTimeout(borderRemovalTimer)
				}

				borderRemovalTimer = setTimeout(
					removeBorderOnCurrentlySelectedElement,
					momentaryBorderTime)
			}
		}

		// Restore tabindex value
		if (originalTabindex === null) {
			elementInfo.element.removeAttribute('tabindex')
		} else if (originalTabindex === '0') {
			elementInfo.element.setAttribute('tabindex', '0')
		}

		currentlyFocusedElementInfo = elementInfo
	}

	function removeBorderOnCurrentlySelectedElement() {
		if (currentBorderElement) {
			justMadeChanges = true
			currentBorderElement.remove()
			currentLabelElement.remove()
			window.removeEventListener('resize', currentResizeHandler)
			currentBorderElement = null
			currentLabelElement = null
		}

		// currentlyFocusedElementInfo is not deleted, as we may be in the
		// middle of updating (redrawing) a border due to settings changes
	}

	// This needs to be a separate (and public) declaration because external
	// stuff calls it, but the options-handling code can't access 'this'.
	this.removeBorderOnCurrentlySelectedElement
		= removeBorderOnCurrentlySelectedElement

	// Did we just make changes to a border? If so, report this, so that the
	// mutation observer can ignore it.
	this.didJustMakeChanges = function() {
		const didChanges = justMadeChanges
		justMadeChanges = false
		return didChanges
	}


	//
	// Private API
	//

	// Add the landmark border and label for an element
	// Note: only one should be drawn at a time
	function addBorder(elementInfo) {
		drawBorderAndLabel(
			elementInfo.element,
			landmarkName(elementInfo),
			settings.borderColour,
			labelFontColour,  // computed as a result of settings
			settings.borderFontSize)
	}

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

		currentBorderElement = borderDiv
		currentLabelElement = labelDiv
		currentResizeHandler = () => resize(element)

		window.addEventListener('resize', currentResizeHandler)
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

	// When the viewport changes, update the border <div>'s size
	function resize(element) {
		sizeBorderAndLabel(
			element,
			currentBorderElement,
			currentLabelElement)
	}

	// Work out if the label font colour should be black or white
	function updateLabelFontColour() {
		labelFontColour = contrastChecker.foregroundTextColour(
			settings.borderColour,
			settings.borderFontSize,
			true)  // the font is always bold
	}

	// Redraw an existing border
	function redrawBorderAndLabel() {
		if (currentBorderElement) {
			if (settings.borderType === 'persistent') {
				removeBorderOnCurrentlySelectedElement()
				addBorder(currentlyFocusedElementInfo)
			}
		}
	}

	// Should a border be added/removed?
	function borderTypeChange() {
		if (settings.borderType === 'persistent') {
			if (currentlyFocusedElementInfo) {
				addBorder(currentlyFocusedElementInfo)
			}
		} else {
			removeBorderOnCurrentlySelectedElement()
		}
	}
}
