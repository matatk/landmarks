'use strict'
/* global LandmarksFinder ElementFocuser */

const lf = new LandmarksFinder(window, document)
const ef = new ElementFocuser()


//
// Guard for focusing elements
//

// Check that it is OK to focus an landmark element
function checkFocusElement(callbackReturningElement) {
	// The user may use the keyboard commands before landmarks have been found
	// However, the content script will run and find any landmarks very soon
	// after the page has loaded.
	if (!lf.haveSearchedForLandmarks()) {
		alert(browser.i18n.getMessage('pageNotLoadedYet') + '.')
		return
	}

	if (lf.numberOfLandmarks === 0) {
		alert(browser.i18n.getMessage('noLandmarksFound') + '.')
		return
	}

	ef.focusElement(callbackReturningElement())
}


//
// Extension Message Management
//

// Act on requests from the background or pop-up scripts
browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
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
	browser.runtime.sendMessage({
		request: 'update-badge',
		landmarks: lf.numberOfLandmarks()
	})
}


//
// Content Script Entry Point
//

// Most pages I've tried have got to a readyState of 'complete' within 10-100ms.
// Therefore this should easily be sufficient.
function bootstrap() {
	const attemptInterval = 500
	const maximumAttempts = 4
	let landmarkFindingAttempts = 0
	const bootstrapTime = performance.now()

	lf.reset()
	sendUpdateBadgeMessage()

	function timeFind() {
		const start = performance.now()
		lf.find()
		const end = performance.now()
		console.log(`Landmarks: took ${Math.round(end - start)}ms `
			+ `to find landmarks on ${window.location} `
			+ `${Math.round(end - bootstrapTime)}ms after booting `
			+ `(${landmarkFindingAttempts} attempts)`)
	}

	function shouldRefreshLandmarkss(mutations) {
		for (const mutation of mutations) {
			if (mutation.type === 'childList') {
				for (const nodes of [mutation.addedNodes, mutation.removedNodes]) {
					for (const node of nodes) {
						if (node.nodeType === Node.ELEMENT_NODE) {
							return true
						}
					}
				}
			} else {  // must be 'attribute'
				if (mutation.attributeName === 'style') {
					if (/display|visibility/.test(
						mutation.target.getAttribute(mutation.attributeName))) {
						return true
					}
					return false
				}
				// TODO if class change, check if it's related to visiblity
				//       don't think we need to check for child nodes, as they are
				//			not relevant if it's not related to visibility(???)

				// TODO then if we get here it's a non-style/class change...
				//      could see if it's a relevant aria change?
				return true
			}
		}
		return false
	}

	function setUpMutationObserver() {
		const observer = new MutationObserver(function(mutations) {
			const start = performance.now()
			const refreshLandmarks = shouldRefreshLandmarkss(mutations)
			const end = performance.now()
			console.log(`Landmarks: took ${Math.round(end - start)}ms to decide: `
				+ `refresh landmarks? ${refreshLandmarks}`)
			if (refreshLandmarks) {
				timeFind()
				sendUpdateBadgeMessage()
				// FIXME if same element in new list, carry on for cur pos
				// FIXME time that, too
			}
		})

		observer.observe(document, {
			attributes: true,
			childList: true,
			subtree: true,
			attributeFilter: [
				'class', 'style', 'hidden', 'role', 'aria-labelledby', 'aria-label'
			]
		})
	}

	function bootstrapCore() {
		landmarkFindingAttempts += 1

		if (document.readyState === 'complete') {
			timeFind()
			sendUpdateBadgeMessage()
			setUpMutationObserver()
		} else if (landmarkFindingAttempts < maximumAttempts) {
			setTimeout(bootstrapCore, attemptInterval)
		} else {
			throw new Error('Landmarks: unable to find landmarks '
				+ `after ${maximumAttempts} attempts.`)
		}
	}

	setTimeout(bootstrapCore, attemptInterval)
}

bootstrap()
