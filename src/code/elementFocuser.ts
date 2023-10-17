import { defaultBorderSettings } from './defaults.js'
import type BorderDrawer from './borderDrawer.js'

const momentaryBorderTime = 2000

export default class ElementFocuser {
	borderType = defaultBorderSettings.borderType  // cached for simplicity
	managingBorders = true  // draw and remove borders by default

	currentElementInfo: LandmarkListEntry | null = null
	borderRemovalTimer: ReturnType<typeof setTimeout> | null = null

	borderDrawer: BorderDrawer

	constructor(borderDrawer: BorderDrawer) {
		this.borderDrawer = borderDrawer

		//
		// Options handling
		//

		// Take a local copy of the border type option at the start (this means
		// that 'gets' of options don't need to be done asynchronously in the rest
		// of the code).
		browser.storage.sync.get(defaultBorderSettings, items => {
			this.borderType = items['borderType']
		})

		browser.storage.onChanged.addListener(changes => {
			if ('borderType' in changes) {
				this.borderType =
					changes.borderType.newValue ?? defaultBorderSettings.borderType
				this.#borderTypeChange()
			}
		})
	}


	//
	// Public API
	//

	// Set focus on the selected landmark element. It takes an element info
	// object, as returned by the various LandmarksFinder functions.
	//
	// Note: this should only be called if landmarks were found. The check
	//       for this is done in the main content script, as it involves UI
	//       activity, and couples finding and focusing.
	focusElement(elementInfo: LandmarkListEntry) {
		if (this.managingBorders) this.clear()

		// Ensure that the element is focusable
		const originalTabindex = elementInfo.element.getAttribute('tabindex')
		if (originalTabindex === null || originalTabindex === '0') {
			elementInfo.element.setAttribute('tabindex', '-1')
		}

		elementInfo.element.scrollIntoView()  // always go to the top of it
		elementInfo.element.focus()

		// Add the border and set a timer to remove it (if required by user)
		if (this.managingBorders && this.borderType !== 'none') {
			this.borderDrawer.addBorder(elementInfo)

			if (this.borderType === 'momentary') {
				// TODO: Change the null default value to undefined?
				clearTimeout(this.borderRemovalTimer ?? undefined)
				this.borderRemovalTimer = setTimeout(() => {
					if (this.currentElementInfo) {
						this.borderDrawer.removeBorderOn(this.currentElementInfo.element)
					}
				}, momentaryBorderTime)
			}
		}

		// Restore tabindex value
		if (originalTabindex === null) {
			elementInfo.element.removeAttribute('tabindex')
		} else if (originalTabindex === '0') {
			elementInfo.element.setAttribute('tabindex', '0')
		}

		this.currentElementInfo = elementInfo
	}

	// By default, this object will ask for borders to be drawn and removed
	// according to user preferences (and reflect changes in preferences). If
	// it shouldn't (i.e. because all borders are being shown, and managed by
	// other code) then this can be turned off - though it will still manage
	// element focusing.
	manageBorders(canManageBorders: boolean) {
		this.managingBorders = canManageBorders
		if (!canManageBorders && this.borderRemovalTimer) {
			clearTimeout(this.borderRemovalTimer)
		} else if (this.borderType === 'persistent') {
			// When we stop showing all landmarks at once, ensure the last
			// single one is put back if it was permanent.
			if (this.currentElementInfo) {
				this.borderDrawer.addBorder(this.currentElementInfo)
			}
		}
	}

	isManagingBorders() {
		return this.managingBorders
	}

	clear() {
		if (this.currentElementInfo) {
			this.#resetEverything()
		}
	}

	// When the document is changed, the currently-focused element may have
	// been removed, or at least changed size/position.
	// Note: this doesn't call the border drawer to refresh all borders, as
	//       this object is mainly concerned with just the current one, but
	//       after a mutation, any borders that are drawn should be refreshed.
	refreshFocusedElement() {
		if (this.currentElementInfo) {
			if (!document.body.contains(this.currentElementInfo.element)) {
				this.#resetEverything()
			}
		}
	}


	//
	// Private API
	//

	// Used internally when we know we have a currently selected element
	#resetEverything() {
		if (this.borderRemovalTimer) {
			clearTimeout(this.borderRemovalTimer)
		}
		if (this.currentElementInfo) {
			this.borderDrawer.removeBorderOn(this.currentElementInfo.element)
		}
		this.currentElementInfo = null
	}

	// Should a border be added/removed?
	#borderTypeChange() {
		if (this.currentElementInfo && this.managingBorders) {
			if (this.borderType === 'persistent') {
				this.borderDrawer.addBorder(this.currentElementInfo)
			} else {
				this.borderDrawer.removeBorderOn(this.currentElementInfo.element)
			}
		}
	}
}
