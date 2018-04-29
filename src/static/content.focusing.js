'use strict'
/* exported ElementFocuser */
/* global landmarkName defaultBorderSettings */

function ElementFocuser() {
	const momentaryBorderTime = 2000
	let justMadeChanges = false
	let currentlyFocusedElementBorder = null
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

	// Create an element on the page to act as a border for the element to be
	// highlighted, and a label for it.
	//
	// The format of the settings object is { colour: #<hex>, fontSize: <int> }
	function addBorder(element, name, settings) {
		const zIndex = 10000000
		const bounds = element.getBoundingClientRect()

		const labelContent = document.createTextNode(name)

		const labelDiv = document.createElement('div')
		labelDiv.style.backgroundColor = settings.colour
		labelDiv.style.color = 'white'
		labelDiv.style.fontSize = settings.fontSize + 'px'
		labelDiv.style.fontWeight = 'bold'
		labelDiv.style.fontFamily = 'sans-serif'
		labelDiv.style.float = 'right'
		labelDiv.style.paddingLeft = '0.25em'
		labelDiv.style.paddingRight = '0.25em'
		labelDiv.style.zIndex = zIndex

		const borderDiv = document.createElement('div')
		borderDiv.style.left = window.scrollX + bounds.left + 'px'
		borderDiv.style.top = window.scrollY + bounds.top + 'px'
		borderDiv.style.width = bounds.width + 'px'
		borderDiv.style.height = bounds.height + 'px'
		borderDiv.style.border = '2px solid ' + settings.colour
		borderDiv.style.outline = '2px solid ' + settings.colour
		borderDiv.style.position = 'absolute'
		borderDiv.style.zIndex = zIndex
		borderDiv.dataset.isLandmarkBorder = true

		labelDiv.appendChild(labelContent)
		borderDiv.appendChild(labelDiv)
		justMadeChanges = true
		document.body.appendChild(borderDiv)
		// FIXME what if changing viewport size?

		currentlyFocusedElementBorder = borderDiv
	}
}
