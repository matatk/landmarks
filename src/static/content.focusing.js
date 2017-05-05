'use strict'
/* global LandmarksFinder */

const lf = new LandmarksFinder(window, document)

let haveSearchedForLandmarks

function ElementFocuser() {
	let previouslySelectedElement
	let currentlySelectedElement

	//
	// Public API
	//

	// Check that it is OK to focus an landmark element
	this.focusElement = function(callbackReturningElement) {
		// The user may use the keyboard commands before landmarks have been found
		// However, the content script will run and find any landmarks very soon
		// after the page has loaded.
		if (!haveSearchedForLandmarks) {
			alert(chrome.i18n.getMessage('pageNotLoadedYet') + '.')
			return
		}

		if (lf.numberOfLandmarks === 0) {
			alert(chrome.i18n.getMessage('noLandmarksFound') + '.')
			return
		}

		_focusElement(callbackReturningElement())
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

	// Set focus on the selected landmark
	function _focusElement(element) {
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

	function addBorder(element) {
		element.style.outline = 'medium solid red'
	}

	function removeBorder(element) {
		element.style.outline = ''
	}
}

const ef = new ElementFocuser()
