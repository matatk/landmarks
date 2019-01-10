import { defaultBorderSettings } from './defaults'

export default function ElementFocuser(doc, borderDrawer) {
	const momentaryBorderTime = 2000

	let borderType = defaultBorderSettings.borderType  // cached for simplicity
	let currentElementInfo = null
	let currentElementBorderDrawn = null
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
	this.focusElement = function(elementInfo, drawBorder = true) {
		if (drawBorder) this.clear()

		// Ensure that the element is focusable
		const originalTabindex = elementInfo.element.getAttribute('tabindex')
		if (originalTabindex === null || originalTabindex === '0') {
			elementInfo.element.setAttribute('tabindex', '-1')
		}

		elementInfo.element.scrollIntoView()  // always go to the top of it
		elementInfo.element.focus()

		// Add the border and set a borderRemovalTimer to remove it (if
		// required by user settings)
		if (drawBorder && borderType !== 'none') {
			borderDrawer.addBorder(elementInfo)

			if (borderType === 'momentary') {
				this.clearBorderRemovalTimer()

				borderRemovalTimer = setTimeout(
					// Only remove border; keep elementInfo in case prefs change
					borderDrawer.removeBorderOn(currentElementInfo.element),
					momentaryBorderTime)
			}
		}

		// Restore tabindex value
		if (originalTabindex === null) {
			elementInfo.element.removeAttribute('tabindex')
		} else if (originalTabindex === '0') {
			elementInfo.element.setAttribute('tabindex', '0')
		}

		currentElementInfo = elementInfo
		currentElementBorderDrawn = drawBorder
	}

	this.clear = function() {
		if (currentElementInfo) {
			clearCurrentElementBorderAndTimer()
		}
	}

	// When the document is changed, the currently-focused element may have
	// been removed, or at least changed size/position.
	// Note: this doesn't call the border drawer to refresh all borders, as
	//       this object is mainly concerned with just the current one, but
	//       after a mutation, any borders that are drawn should be refreshed.
	this.refreshFocusedElement = function() {
		if (currentElementInfo) {
			if (!doc.body.contains(currentElementInfo.element)) {
				clearCurrentElementBorderAndTimer()
			}
		}
	}

	// If the border is scheduled to be removed, and the user toggles all
	// borders on, then the border should not be removed anymore.
	this.clearBorderRemovalTimer = function() {
		if (borderRemovalTimer) {
			clearTimeout(borderRemovalTimer)
		}
	}


	//
	// Private API
	//

	// Used internally when we know we have a currently selected element
	function clearCurrentElementBorderAndTimer() {
		this.clearBorderRemovalTimer()
		borderDrawer.removeBorderOn(currentElementInfo.element)
		currentElementInfo = null
		currentElementBorderDrawn = null
	}

	// Should a border be added/removed?
	function borderTypeChange() {
		if (borderType === 'persistent') {
			if (currentElementInfo) {
				borderDrawer.addBorder(currentElementInfo)
			}
		} else if (currentElementBorderDrawn) {
			borderDrawer.removeBorderOn(currentElementInfo.element)
		}
	}
}
