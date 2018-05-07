'use strict'
/* exported ElementFocuser */
/* global landmarkName defaultBorderSettings ContrastChecker */

function ElementFocuser() {
	const momentaryBorderTime = 2000
	let justMadeChanges = false
	let currentlyFocusedElementBorder = null
	let currentResizeHandler = null
	let timer = null

	const contrastChecker = new ContrastChecker()

	// Get settings and keep them up-to-date
	const settings = {}
	let labelFontColour = null

	browser.storage.sync.get(defaultBorderSettings, function(items) {
		for (const option in items) {
			settings[option] = items[option]
			checkLabelFontColour(option)
		}
	})

	browser.storage.onChanged.addListener(function(changes) {
		for (const option in changes) {
			if (settings.hasOwnProperty(option)) {
				settings[option] = changes[option].newValue
				checkLabelFontColour(option)
			}
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
		const element = elementInfo.element
		const type = settings.borderType
		const appearance = {  // passed to lower-level drawing code
			colour: settings.borderColour,
			fontColour: labelFontColour,
			fontSize: settings.borderLabelFontSize
		}

		removeBorderOnCurrentlySelectedElement()

		// Ensure that the element is focusable
		const originalTabindex = element.getAttribute('tabindex')
		if (originalTabindex === null || originalTabindex === '0') {
			element.setAttribute('tabindex', '-1')
		}

		element.scrollIntoView()  // always go to the top of it
		element.focus()

		// Add the border and set a timer to remove it (if required by user)
		if (type === 'persistent' || type === 'momentary') {
			addBorder(element, landmarkName(elementInfo), appearance)

			if (type === 'momentary') {
				if (timer) {
					clearTimeout(timer)
				}
				timer = setTimeout(
					removeBorderOnCurrentlySelectedElement,
					momentaryBorderTime)
			}
		}

		// Restore tabindex value
		if (originalTabindex === null) {
			element.removeAttribute('tabindex')
		} else if (originalTabindex === '0') {
			element.setAttribute('tabindex', '0')
		}
	}

	function removeBorderOnCurrentlySelectedElement() {
		if (currentlyFocusedElementBorder) {
			justMadeChanges = true
			currentlyFocusedElementBorder.remove()
			window.removeEventListener('resize', currentResizeHandler)
			currentlyFocusedElementBorder = null
		}
	}

	// Also needs to be available publicly
	// TODO just define the above as this.blah
	this.removeBorderOnCurrentlySelectedElement =
		removeBorderOnCurrentlySelectedElement

	// Did we just make changes to a border? If so the mutations can be
	// ignored.
	this.didJustMakeChanges = function() {
		const didChanges = justMadeChanges
		justMadeChanges = false
		return didChanges
	}


	//
	// Private API
	//

	// Given an element on the page and an element acting as the border, size
	// the border appropriately for the element
	function sizeBorder(element, border) {
		const bounds = element.getBoundingClientRect()
		border.style.left = window.scrollX + bounds.left + 'px'
		border.style.top = window.scrollY + bounds.top + 'px'
		border.style.width = bounds.width + 'px'
		border.style.height = bounds.height + 'px'
	}

	// Create an element on the page to act as a border for the element to be
	// highlighted, and a label for it.
	//
	// The format of the settings object is
	//     { colour: #<hex>, fontColour: #<hex>, fontSize: <int> }
	function addBorder(element, name, settings) {
		const zIndex = 10000000
		const labelContent = document.createTextNode(name)

		const labelDiv = document.createElement('div')
		labelDiv.style.backgroundColor = settings.colour
		labelDiv.style.color = settings.fontColour
		labelDiv.style.fontSize = settings.fontSize + 'px'
		labelDiv.style.fontWeight = 'bold'
		labelDiv.style.fontFamily = 'sans-serif'
		labelDiv.style.float = 'right'
		labelDiv.style.paddingLeft = '0.75em'
		labelDiv.style.paddingRight = '0.75em'
		labelDiv.style.paddingTop = '0.25em'
		labelDiv.style.paddingBottom = '0.25em'
		labelDiv.style.zIndex = zIndex

		const borderDiv = document.createElement('div')
		sizeBorder(element, borderDiv)
		borderDiv.style.border = '2px solid ' + settings.colour
		borderDiv.style.outline = '2px solid ' + settings.colour
		borderDiv.style.position = 'absolute'
		borderDiv.style.zIndex = zIndex
		borderDiv.dataset.isLandmarkBorder = true

		labelDiv.appendChild(labelContent)
		borderDiv.appendChild(labelDiv)
		justMadeChanges = true
		document.body.appendChild(borderDiv)

		currentlyFocusedElementBorder = borderDiv
		currentResizeHandler = () => resize(element)

		window.addEventListener('resize', currentResizeHandler)
	}

	// When the viewport changes, update the border <div>
	function resize(element) {
		sizeBorder(element, currentlyFocusedElementBorder)
	}

	// When getting or updating options, update the label font colour in
	// line with the border colour
	function checkLabelFontColour(option) {
		if (option === 'borderColour') {
			labelFontColour = contrastChecker.labelTextColour(settings[option])
		}
	}
}
