import landmarkName from './landmarkName.js'
import { defaultBorderSettings } from './defaults.js'
import type ContrastChecker from './contrastChecker.js'

const BORDER_WIDTH_PX = 4

interface BorderInfo {
	border: HTMLElement
	label: HTMLElement
	guessed: boolean
}

type ElementHighlights = Map<HTMLElement, BorderInfo>

export default class BorderDrawer {
	#borderedElements: ElementHighlights = new Map()
	#borderColour = defaultBorderSettings.borderColour      // cached locally
	#borderFontSize = defaultBorderSettings.borderFontSize  // cached locally
	#labelFontColour!: LabelFontColour  // computed based on border colour
	#madeDOMChanges = false
	#contrastChecker: ContrastChecker

	constructor(contrastChecker: ContrastChecker) {
		this.#contrastChecker = contrastChecker

		// These are all called in response to messages or mutations
		this.addBorder = this.addBorder.bind(this)
		this.hasMadeDOMChanges = this.hasMadeDOMChanges.bind(this)
		this.removeBorderOn = this.removeBorderOn.bind(this)

		window.addEventListener('resize', this.#resizeHandler.bind(this))

		//
		// Options handling
		//

		// Take a local copy of relevant options at the start (this means that
		// 'gets' of options don't need to be done asynchronously in the rest of
		// the code). This also computes the initial label font colour (as it
		// depends on the border colour, which forms the label's background).
		browser.storage.sync.get(defaultBorderSettings, items => {
			this.#borderColour = String(items.borderColour)
			this.#borderFontSize = String(items.borderFontSize)
			this.#updateLabelFontColour()
		})

		browser.storage.onChanged.addListener(changes => {
			let needUpdate = false
			if (Object.hasOwn(changes, 'borderColour')) {
				this.#borderColour = String(changes.borderColour.newValue ?? defaultBorderSettings.borderColour)
				needUpdate = true
			}
			if (Object.hasOwn(changes, 'borderFontSize')) {
				this.#borderFontSize = String(changes.borderFontSize.newValue ?? defaultBorderSettings.borderColour)
				needUpdate = true
			}
			if (needUpdate) {
				this.#updateLabelFontColour()
				this.#redrawBordersAndLabels()
			}
		})
	}

	//
	// Window resize handling
	//

	#resizeHandler() {
		for (const [element, related] of this.#borderedElements) {
			if (document.body.contains(element)) {
				this.#sizeBorderAndLabel(element, related.border, related.label)
			} else {
				this.#removeBorderAndDelete(element)
			}
		}
	}

	//
	// Public API
	//

	// Add the landmark border and label for an element. Takes an element info
	// object, as returned by the various LandmarksFinder functions.
	//
	// NOTE: we assume that if an element already exists and we try to add it
	//       again (as may happen if the page changes whilst we're displaying
	//       all elements, and try to add any new ones) that the existing
	//       elements' labels won't have changed.
	addBorder(elementInfo: LandmarkElementInfo) {
		if (!this.#borderedElements.has(elementInfo.element)) {
			this.#drawBorderAndLabel(
				elementInfo.element,
				landmarkName(elementInfo),
				this.#borderColour,
				this.#labelFontColour,  // computed as a result of settings
				this.#borderFontSize,
				elementInfo.guessed)
		}
	}

	// Add the landmark border and label for several elements, and remove any
	// borders associated with elements that currently have borders but aren't
	// in this set. Takes an array of element info objects, as detailed above.
	replaceCurrentBordersWithElements(elementInfoList: LandmarkElementInfo[]) {
		const elementsToAdd = elementInfoList.map(info => info.element)

		for (const elementWithBorder of this.#borderedElements.keys()) {
			if (!elementsToAdd.includes(elementWithBorder)) {
				this.removeBorderOn(elementWithBorder)
			}
		}

		for (const elementInfo of elementInfoList) {
			this.addBorder(elementInfo)
		}
	}

	removeBorderOn(element: HTMLElement) {
		if (this.#borderedElements.has(element)) {
			this.#removeBorderAndDelete(element)
		}
	}

	removeAllBorders() {
		for (const element of this.#borderedElements.keys()) {
			this.#removeBorderAndDelete(element)
		}
	}

	// Did we just make changes to a border? If so, report this, so that the
	// mutation observer can ignore it.
	hasMadeDOMChanges() {
		const didChanges = this.#madeDOMChanges
		this.#madeDOMChanges = false
		return didChanges
	}

	// In case it's detected that an element may've moved due to mutations
	refreshBorders() {
		this.#resizeHandler()
	}

	//
	// Private API
	//

	// Create an element on the page to act as a border for the element to be
	// highlighted, and a label for it; position and style them appropriately
	#drawBorderAndLabel(element: HTMLElement, label: string, colour: string, fontColour: string, fontSize: string, guessed: boolean) {
		const zIndex = '10000000'

		const labelContent = document.createTextNode(label)

		const borderDiv = document.createElement('div')
		const style = guessed ? 'dashed' : 'solid'
		borderDiv.style.border = BORDER_WIDTH_PX + 'px ' + style + ' ' + colour
		borderDiv.style.boxSizing = 'border-box'
		borderDiv.style.margin = '0'
		borderDiv.style.padding = '0'
		// Pass events through - https://stackoverflow.com/a/6441884/1485308
		borderDiv.style.pointerEvents = 'none'
		borderDiv.style.position = 'absolute'
		borderDiv.style.zIndex = zIndex

		const labelDiv = document.createElement('div')
		labelDiv.style.backgroundColor = colour
		labelDiv.style.border = 'none'
		labelDiv.style.boxSizing = 'border-box'
		labelDiv.style.color = fontColour
		labelDiv.style.display = 'inline-block'
		labelDiv.style.fontFamily = 'sans-serif'
		labelDiv.style.fontSize = fontSize + 'px'
		labelDiv.style.fontWeight = 'bold'
		labelDiv.style.margin = '0'
		labelDiv.style.paddingBottom = '0.25em'
		labelDiv.style.paddingLeft = '0.75em'
		labelDiv.style.paddingRight = '0.75em'
		labelDiv.style.paddingTop = '0.25em'
		labelDiv.style.position = 'absolute'
		labelDiv.style.whiteSpace = 'nowrap'
		labelDiv.style.zIndex = zIndex

		labelDiv.appendChild(labelContent)

		document.body.appendChild(borderDiv)
		document.body.appendChild(labelDiv)
		this.#madeDOMChanges = true  // seems to be covered by sizeBorderAndLabel()
		this.#sizeBorderAndLabel(element, borderDiv, labelDiv)

		this.#borderedElements.set(element, {
			'border': borderDiv,
			'label': labelDiv,
			'guessed': guessed
		})
	}

	// Given an element on the page and elements acting as the border and
	// label, size the border, and position the label, appropriately for the
	// element
	#sizeBorderAndLabel(element: HTMLElement, border: HTMLElement, label: HTMLElement) {
		const elementBounds = element.getBoundingClientRect()
		const elementTopEdgeStyle = window.scrollY + elementBounds.top + 'px'
		const elementLeftEdgeStyle = window.scrollX + elementBounds.left + 'px'
		const elementRightEdgeStyle = document.documentElement.clientWidth -
			(window.scrollX + elementBounds.right) + 'px'

		border.style.left = elementLeftEdgeStyle
		border.style.top = elementTopEdgeStyle
		border.style.width = elementBounds.width + 'px'
		border.style.height = elementBounds.height + 'px'

		// Try aligning the right edge of the label to the right edge of the
		// border.
		//
		// If the label would go off-screen left, align the left edge of the
		// label to the left edge of the border.

		label.style.removeProperty('left')  // in case this was set before

		label.style.top = elementTopEdgeStyle
		label.style.right = elementRightEdgeStyle

		// Is part of the label off-screen?
		const labelBounds = label.getBoundingClientRect()
		if (labelBounds.left < 0) {
			label.style.removeProperty('right')
			label.style.left = elementLeftEdgeStyle
		}

		this.#madeDOMChanges = true  // seems to be in the right place
	}

	// FIXME: Instead of having to call this with an element that's known to
	//        have a border, we should call this with the BorderInfo (which
	//        makes the guarnatee for us). That would also make the code more
	//        performant.
	#removeBorderAndDelete(element: HTMLElement) {
		this.#removeBorderAndLabelFor(element)
		this.#borderedElements.delete(element)
	}

	// Remove *known-existing* DOM nodes for the border and label
	//
	// NOTE: does not remove the record of the element, so as to avoid an
	//       infinite loop when redrawing borders.
	//       TODO fix this with .keys()?
	//
	// FIXME: Instead of having to call this with an element that's known to
	//        have a border, we should call this with the BorderInfo (which
	//        makes the guarnatee for us). That would also make the code more
	//        performant.
	#removeBorderAndLabelFor(element: HTMLElement) {
		const related = this.#borderedElements.get(element)!
		related.border.remove()
		related.label.remove()
		this.#madeDOMChanges = true
	}

	// Work out if the label font colour should be black or white
	#updateLabelFontColour() {
		this.#labelFontColour = this.#contrastChecker.foregroundTextColour(
			this.#borderColour,
			parseInt(this.#borderFontSize),
			true)  // the font is always bold
	}

	#redrawBordersAndLabels() {
		for (const [element, related] of this.#borderedElements) {
			const labelText = related.label.innerText
			this.#removeBorderAndLabelFor(element)
			this.#drawBorderAndLabel(
				element,
				labelText,
				this.#borderColour,
				this.#labelFontColour,  // computed as a result of settings
				this.#borderFontSize,
				related.guessed)
		}
	}
}
