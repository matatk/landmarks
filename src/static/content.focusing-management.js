'use strict'
/* global LandmarksFinder */

const lf = new LandmarksFinder(window, document)

let haveSearchedForLandmarks
let previouslySelectedElement
let currentlySelectedElement

let whenFoundHook = null


//
// Focusing
//

// Check that it is OK to focus an landmark element
function focusElement(callbackReturningElement) {
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

// Set focus on the selected landmark
function _focusElement(element) {
	chrome.storage.sync.get({
		borderType: 'momentary'
	}, function(items) {
		previouslySelectedElement = currentlySelectedElement

		const borderTypePref = items.borderType

		removeBorderOnPreviouslySelectedElement()

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

function addBorder(element) {
	element.style.outline = 'medium solid red'
}

function removeBorder(element) {
	element.style.outline = ''
}


//
// Extension Bootstroapping and Messaging
//

// Act on requests from the background or pop-up scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	switch (message.request) {
		case 'get-landmarks':
			// The pop-up is requesting the list of landmarks on the page

			if (!haveSearchedForLandmarks) {
				sendResponse('wait')
			}
			// We only guard for landmarks having been found here because the
			// other messages still need to be handled regardless (or, in some
			// cases, won't be recieved until after the pop-up has been
			// displayed, so this check only needs to be here).

			sendResponse(lf.filter())
			break
		case 'get-landmarks-wait':
			// Similar to the above, but waits until the landmarks have been
			// found before sending the message.  This is used when the popup
			// is open and there was an error (i.e. when the content script
			// needed injecting).
			whenFoundHook = function() {
				sendResponse(lf.filter())
			}
			// Need to return true to signify an asynch response is coming
			// https://developer.chrome.com/extensions/runtime#event-onMessage
			return true
		case 'focus-landmark':
			// Triggered by clicking on an item in the pop-up, or indirectly
			// via one of the keyboard shortcuts (if landmarks are present)
			focusElement(() => lf.landmarkElement(message.index))
			break
		case 'next-landmark':
			// Triggered by keyboard shortcut
			focusElement(lf.nextLandmarkElement)
			break
		case 'prev-landmark':
			// Triggered by keyboard shortcut
			focusElement(lf.previousLandmarkElement)
			break
		case 'trigger-refresh':
			// On sites that use single-page style techniques to transition
			// (such as YouTube and GitHub) we monitor in the background script
			// for when the History API is used to update the URL of the page
			// (indicating that its content has changed substantially). When
			// this happens, we should treat it as a new page, and fetch
			// landmarks again when asked.
			removeBorderOnPreviouslySelectedElement()  // FIXME current?
			bootstrap()
			break
		default:
			throw('Landmarks: content script received unknown message:',
				message, 'from', sender)
	}
})

function sendUpdateBadgeMessage() {
	// Let the background script know how many landmarks were found, so
	// that it can update the browser action badge.
	chrome.runtime.sendMessage({
		request: 'update-badge',
		landmarks: lf.numberOfLandmarks()
	})
}


//
// Content Script Entry Point
//

function bootstrap() {
	const attemptInterval = 1000
	const maximumAttempts = 10
	let landmarkFindingAttempts = 0
	haveSearchedForLandmarks = false

	function _bootstrap() {
		landmarkFindingAttempts += 1
		if (document.readyState === 'complete') {
			lf.find()
			haveSearchedForLandmarks = true
			sendUpdateBadgeMessage()
			if (whenFoundHook) {
				whenFoundHook()
				whenFoundHook = null
			}
		} else if (landmarkFindingAttempts <= maximumAttempts) {
			setTimeout(bootstrap, attemptInterval)
		} else {
			throw new Error('Landmarks: unable to find landmarks after ' +
				String(maximumAttempts) + 'attempts.')
		}
	}

	setTimeout(_bootstrap, attemptInterval)
}

bootstrap()
