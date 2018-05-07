'use strict'
/* exported ElementFocuser */
/* global landmarkName defaultBorderSettings */

function ElementFocuser() {
	const momentaryBorderTime = 2000
	let justMadeChanges = false
	let currentlyFocusedElementBorder = null
	let currentResizeHandler = null
	let timer = null


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
		browser.storage.sync.get(defaultBorderSettings, function(items) {
			const element = elementInfo.element
			const borderShown = items.borderType
			const borderPrefs = {
				colour: items.borderColour,
				fontColour: items.borderLabelColour,
				fontSize: items.borderLabelFontSize
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
			if (borderShown === 'persistent' || borderShown === 'momentary') {
				addBorder(element, landmarkName(elementInfo), borderPrefs)

				if (borderShown === 'momentary') {
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
		})
	}

	function removeBorderOnCurrentlySelectedElement() {
		if (currentlyFocusedElementBorder) {
			currentlyFocusedElementBorder.remove()
			window.removeEventListener('resize', currentResizeHandler)
			currentlyFocusedElementBorder = null  // TOOD needed?
		}
	}

	// Also needs to be available publicly
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
		labelDiv.style.paddingLeft = '0.25em'
		labelDiv.style.paddingRight = '0.25em'
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
}
