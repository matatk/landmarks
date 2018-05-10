'use strict'
/* exported ElementFocuser */
/* global landmarkName defaultBorderSettings ContrastChecker */

function ElementFocuser() {
	const momentaryBorderTime = 2000
	let justMadeChanges = false
	let currentlyFocusedElementInfo = null    // keep for border redraws
	let currentlyFocusedElementBorder = null  // indicates if border is shown
	let borderRemovalTimer = null

	const settings = {}         // caches options locally (for simpler code)
	let labelFontColour = null  // computed based on border colour
	const contrastChecker = new ContrastChecker()

	let currentBorderResizeHandler = null


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

		if ('borderColour' in changes || 'borderLabelFontSize' in changes) {
			updateLabelFontColour()
			redrawBorder()
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
		if (currentlyFocusedElementBorder) {
			justMadeChanges = true
			currentlyFocusedElementBorder.remove()
			window.removeEventListener('resize', currentBorderResizeHandler)
			currentlyFocusedElementBorder = null
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
		drawBorder(
			elementInfo.element,
			landmarkName(elementInfo),
			settings.borderColour,
			labelFontColour,  // computed as a result of settings
			settings.borderLabelFontSize)
	}

	// Create an element on the page to act as a border for the element to be
	// highlighted, and a label for it; position and style them appropriately
	function drawBorder(element, label, colour, fontColour, fontSize) {
		const zIndex = 10000000
		const labelContent = document.createTextNode(label)

		const labelDiv = document.createElement('div')
		labelDiv.style.backgroundColor = colour
		labelDiv.style.color = fontColour
		labelDiv.style.fontSize = fontSize + 'px'
		labelDiv.style.fontWeight = 'bold'
		labelDiv.style.fontFamily = 'sans-serif'
		labelDiv.style.float = 'right'
		labelDiv.style.paddingLeft = '0.75em'
		labelDiv.style.paddingRight = '0.75em'
		labelDiv.style.paddingTop = '0.25em'
		labelDiv.style.paddingBottom = '0.25em'
		labelDiv.style.zIndex = zIndex
		labelDiv.style.margin = '0'
		labelDiv.style.border = 'none'
		labelDiv.style.outline = 'none'

		const borderDiv = document.createElement('div')
		sizeBorder(element, borderDiv)
		borderDiv.style.border = '2px solid ' + colour
		borderDiv.style.outline = '2px solid ' + colour
		borderDiv.style.position = 'absolute'
		borderDiv.style.zIndex = zIndex
		borderDiv.style.margin = '0'
		borderDiv.style.padding = '0'

		labelDiv.appendChild(labelContent)
		borderDiv.appendChild(labelDiv)
		justMadeChanges = true
		document.body.appendChild(borderDiv)

		currentlyFocusedElementBorder = borderDiv
		currentBorderResizeHandler = () => resize(element)

		window.addEventListener('resize', currentBorderResizeHandler)
	}

	// Given an element on the page and an element acting as the border, size
	// the border appropriately for the element
	function sizeBorder(element, border) {
		const bounds = element.getBoundingClientRect()
		border.style.left = window.scrollX + bounds.left + 'px'
		border.style.top = window.scrollY + bounds.top + 'px'
		border.style.width = bounds.width + 'px'
		border.style.height = bounds.height + 'px'
	}

	// When the viewport changes, update the border <div>'s size
	function resize(element) {
		sizeBorder(element, currentlyFocusedElementBorder)
	}

	// Work out if the label font colour should be black or white
	function updateLabelFontColour() {
		labelFontColour = contrastChecker.foregroundTextColour(
			settings.borderColour,
			settings.borderLabelFontSize,
			true)  // the font is always bold
	}

	// Redraw an existing border
	function redrawBorder() {
		if (currentlyFocusedElementBorder) {
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
