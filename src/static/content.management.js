'use strict'
/* global LandmarksFinder ElementFocuser */

const lf = new LandmarksFinder(window, document)
const ef = new ElementFocuser()

let whenFoundHook = null  // allows us to send a message when landmarks found


//
// Guard for focusing elements
//

// Check that it is OK to focus an landmark element
function checkFocusElement(callbackReturningElement) {
	// The user may use the keyboard commands before landmarks have been found
	// However, the content script will run and find any landmarks very soon
	// after the page has loaded.
	if (!lf.haveSearchedForLandmarks()) {
		alert(chrome.i18n.getMessage('pageNotLoadedYet') + '.')
		return
	}

	if (lf.numberOfLandmarks === 0) {
		alert(chrome.i18n.getMessage('noLandmarksFound') + '.')
		return
	}

	ef.focusElement(callbackReturningElement())
}


//
// Extension Message Management
//

// Act on requests from the background or pop-up scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	switch (message.request) {
		case 'get-landmarks':
			// The pop-up is requesting the list of landmarks on the page

			if (!lf.haveSearchedForLandmarks()) {
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
			checkFocusElement(() => lf.landmarkElement(message.index))
			break
		case 'next-landmark':
			// Triggered by keyboard shortcut
			checkFocusElement(lf.nextLandmarkElement)
			break
		case 'prev-landmark':
			// Triggered by keyboard shortcut
			checkFocusElement(lf.previousLandmarkElement)
			break
		case 'trigger-refresh':
			// On sites that use single-page style techniques to transition
			// (such as YouTube and GitHub) we monitor in the background script
			// for when the History API is used to update the URL of the page
			// (indicating that its content has changed substantially). When
			// this happens, we should treat it as a new page, and fetch
			// landmarks again when asked.
			ef.removeBorderOnCurrentlySelectedElement()
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
	lf.reset()

	function _bootstrap() {
		landmarkFindingAttempts += 1
		if (document.readyState === 'complete') {
			lf.find()
			sendUpdateBadgeMessage()
			// If anyone's waiting to hear about found landmarks, tell them
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
