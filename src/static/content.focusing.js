'use strict'
/* exported ElementFocuser */

function ElementFocuser() {
	const momentaryBorderTime = 2000
	let currentlySelectedElement


	//
	// Public API
	//

	// Set focus on the selected landmark element.
	//
	// This function requires an actual DOM element, as returned by various
	// functions of the LandmarksFinder.
	//
	// Note: this should only be called if landmarks were found. The check
	//       for this is done in the main content script, as it involves UI
	//       activity, and couples finding and focusing.
	this.focusElement = function(element) {
		browser.storage.sync.get({
			borderType: 'momentary'
		}, function(items) {
			removeBorderOnCurrentlySelectedElement()

			const borderTypePref = items.borderType

			// Ensure that the element is focusable
			const originalTabindex = element.getAttribute('tabindex')
			if (originalTabindex === null || originalTabindex === '0') {
				element.setAttribute('tabindex', '-1')
			}

			element.focus()

			// Add the border and set a timer to remove it (if required by user)
			if (borderTypePref === 'persistent' || borderTypePref === 'momentary') {
				addBorder(element)

				if (borderTypePref === 'momentary') {
					setTimeout(() => removeBorder(element), momentaryBorderTime)
				}
			}

			// Restore tabindex value
			if (originalTabindex === null) {
				element.removeAttribute('tabindex')
			} else if (originalTabindex === '0') {
				element.setAttribute('tabindex', '0')
			}

			currentlySelectedElement = element
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

	function addBorder(element) {
		element.dataset.landmarksOriginalOutline = element.style.outline
		element.dataset.landmarksOriginalOutlineOffset =
			element.style.outlineOffset

		element.style.outline = '5px solid red'
		element.style.outlineOffset = '-3px'
	}

	function removeBorder(element) {
		element.style.outline = element.dataset.landmarksOriginalOutline
		element.style.outlineOffset =
			element.dataset.landmarksOriginalOutlineOffset

		element.removeAttribute('data-landmarks-original-outline')
		element.removeAttribute('data-landmarks-original-outline-offset')
	}
}
