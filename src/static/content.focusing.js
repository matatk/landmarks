'use strict'

function ElementFocuser() {
	let previouslySelectedElement
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
		chrome.storage.sync.get({
			borderType: 'momentary'
		}, function(items) {
			previouslySelectedElement = currentlySelectedElement

			const borderTypePref = items.borderType

			removeBorderOnPreviouslySelectedElement()  // FIXME undef

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
					setTimeout(function() {
						removeBorder(element)
					}, 2000)
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

	function removeBorderOnPreviouslySelectedElement() {
		if (previouslySelectedElement) {
			removeBorder(previouslySelectedElement)
		}
	}

	// Need this function to be public, but it's also called internally
	this.removeBorderOnPreviouslySelectedElement = removeBorderOnPreviouslySelectedElement


	//
	// Private API
	//

	function addBorder(element) {
		element.style.outline = 'medium solid red'
	}

	function removeBorder(element) {
		element.style.outline = ''
	}
}
