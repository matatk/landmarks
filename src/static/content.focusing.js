'use strict'
/* exported ElementFocuser */
/* global landmarkName */

function ElementFocuser() {
	const momentaryBorderTime = 2000
	let currentlySelectedElement


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
		browser.storage.sync.get({
			borderType: 'momentary'
		}, function(items) {
			removeBorderOnCurrentlySelectedElement()

			// Ensure that the element is focusable
			const originalTabindex = elementInfo.element.getAttribute('tabindex')
			if (originalTabindex === null || originalTabindex === '0') {
				elementInfo.element.setAttribute('tabindex', '-1')
			}

			elementInfo.element.scrollIntoView()  // always go to the top of it
			elementInfo.element.focus()

			// Add the border and set a timer to remove it (if required by user)
			if (items.borderType === 'persistent' || items.borderType === 'momentary') {
				addBorder(elementInfo.element, landmarkName(elementInfo))

				if (items.borderType === 'momentary') {
					setTimeout(
						() => removeBorder(elementInfo.element),
						momentaryBorderTime)
				}
			}

			// Restore tabindex value
			if (originalTabindex === null) {
				elementInfo.element.removeAttribute('tabindex')
			} else if (originalTabindex === '0') {
				elementInfo.element.setAttribute('tabindex', '0')
			}

			currentlySelectedElement = elementInfo.element
		})
	}

	function removeBorderOnCurrentlySelectedElement() {
		if (currentlySelectedElement) {
			removeBorder(currentlySelectedElement)
		}
	}

	// Also needs to be available publicly
	this.removeBorderOnCurrentlySelectedElement =
		removeBorderOnCurrentlySelectedElement


	//
	// Private API
	//

	const elementBorders = {}  // TODO limit growth

	function addBorder(element, name) {
		console.log('adding border to', name)
		const zIndex = 99999
		const bounds = element.getBoundingClientRect()

		const labelContent = document.createTextNode(name)

		const labelDiv = document.createElement('div')
		labelDiv.style.backgroundColor = 'red'
		labelDiv.style.color = 'white'
		labelDiv.style.fontSize = '1em'
		labelDiv.style.fontWeight = 'bold'
		labelDiv.style.fontFamily = 'sans-serif'
		labelDiv.style.float = 'right'
		labelDiv.style.paddingLeft = '0.25em'
		labelDiv.style.paddingRight = '0.25em'
		labelDiv.style.zIndex = zIndex
		labelDiv.appendChild(labelContent)

		const borderDiv = document.createElement('div')
		borderDiv.style.left = window.scrollX + bounds.left + 'px'
		borderDiv.style.top = window.scrollY + bounds.top + 'px'
		borderDiv.style.width = bounds.width + 'px'
		borderDiv.style.height = bounds.height + 'px'
		borderDiv.style.border = '2px solid red'
		borderDiv.style.outline = '2px solid red'
		borderDiv.style.position = 'absolute'
		borderDiv.style.zIndex = zIndex
		borderDiv.dataset.isLandmarkBorder = true

		borderDiv.appendChild(labelDiv)
		document.body.appendChild(borderDiv)

		elementBorders[element] = borderDiv
	}

	function removeBorder(element) {
		if (element in elementBorders) {
			elementBorders[element].remove()
			delete elementBorders[element]
		}
	}
}
