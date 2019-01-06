import { defaultBorderSettings } from './defaults'
import BorderManager from './borderManager'

export default function ElementFocuser(doc) {
	const borderManager = new BorderManager(doc)
	const momentaryBorderTime = 2000

	let borderType = defaultBorderSettings.borderType  // cached for simplicity
	let currentlyFocusedElementInfo = null
	let borderRemovalTimer = null


	//
	// Options handling
	//

	// Take a local copy of the border type option at the start (this means
	// that 'gets' of options don't need to be done asynchronously in the rest
	// of the code).
	browser.storage.sync.get(defaultBorderSettings, function(items) {
		borderType = items['borderType']
	})

	browser.storage.onChanged.addListener(function(changes) {
		if ('borderType' in changes) {
			borderType = changes.borderType.newValue
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
		if (borderType !== 'none') {
			borderManager.addBorder(elementInfo)

			if (borderType === 'momentary') {
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
		if (currentlyFocusedElementInfo) {
			borderManager.removeBorderOn(currentlyFocusedElementInfo.element)
		}
	}

	// This needs to be a separate (and public) declaration because external
	// stuff calls it, but the options-handling code can't access 'this'.
	this.removeBorderOnCurrentlySelectedElement
		= removeBorderOnCurrentlySelectedElement

	// FIXME (re)move
	// Did we just make changes to a border? If so, report this, so that the
	// mutation observer can ignore it.
	this.didJustMakeChanges = function() {
		return borderManager.didJustMakeChanges()
	}

	// When the document is changed, the currently-focused element may have
	// been removed, or at least changed size/position
	this.checkFocusedElement = function() {
		if (currentlyFocusedElementInfo) {
			if (!doc.body.contains(currentlyFocusedElementInfo.element)) {
				removeBorderOnCurrentlySelectedElement()
				currentlyFocusedElementInfo = null  // can't resize anymore
			} else {
				borderManager.runReszieHandlers()
			}
		}
	}

	this.addBorderToElements = function(elementInfoList) {
		for (const elementInfo of elementInfoList) {
			borderManager.addBorder(elementInfo)
		}
	}


	//
	// Private API
	//

	// Should a border be added/removed?
	function borderTypeChange() {
		if (borderType === 'persistent') {
			if (currentlyFocusedElementInfo) {
				borderManager.addBorder(currentlyFocusedElementInfo)
			}
		} else {
			removeBorderOnCurrentlySelectedElement()
		}
	}
}
