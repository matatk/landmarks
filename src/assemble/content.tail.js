/* eslint-disable strict */
/* global g_gotLandmarks g_landmarkedElements g_previousSelectedIndex:true g_selectedIndex:true filterLandmarks g_gotLandmarks:true findLandmarks */

//
// Focusing
//

function adjacentLandmark(delta) {
	// The user may use the keyboard commands before landmarks have been found
	// However, the content script will run and find any landmarks very soon
	// after the page has loaded.
	if (!g_gotLandmarks) {
		alert(chrome.i18n.getMessage('pageNotLoadedYet') + '.')
		return
	}

	if (g_landmarkedElements.length === 0) {
		alert(chrome.i18n.getMessage('noLandmarksFound') + '.')
	} else {
		let newSelectedIndex = -1
		if (delta > 0) {
			newSelectedIndex = (g_previousSelectedIndex + 1) % g_landmarkedElements.length
		} else if (delta < 0) {
			newSelectedIndex = (g_previousSelectedIndex <= 0) ? g_landmarkedElements.length - 1 : g_previousSelectedIndex - 1
		} else {
			throw new Error('Landmarks: adjacentLandmark: delta should be negative or positive')
		}
		focusElement(newSelectedIndex)
	}
}

// Set focus on the selected landmark
//
// This is only triggered from the pop-up (after landmarks have been found) or
// from adjacentLandmark (also after landmarks have been found).
function focusElement(index) {
	getWrapper({
		'border_type': 'momentary'
	}, function(items) {
		const borderTypePref = items.border_type

		removeBorderOnPreviouslySelectedElement()

		// Ensure that the element is focusable
		const element = g_landmarkedElements[index].element
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

		g_selectedIndex = index
		g_previousSelectedIndex = g_selectedIndex
	})
}

function removeBorderOnPreviouslySelectedElement() {
	if (g_previousSelectedIndex >= 0) {
		// TODO sometimes there's an undefined error here (due to no landmarks?)
		const previouslySelectedElement = g_landmarkedElements[g_previousSelectedIndex].element
		// TODO re-insert check for border preference?
		// TODO do we need to check that the DOM element exists, as we did?
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

// TODO: DRY also in options script
function getWrapper(options, action) {
	const area = chrome.storage.sync || chrome.storage.local
	area.get(options, action)
}

// Act on requests from the background or pop-up scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	switch (message.request) {
		case 'get-landmarks':
			// The pop-up is requesting the list of landmarks on the page

			if (!g_gotLandmarks) {
				sendResponse('wait')
			}
			// We only guard for landmarks having been found here because the
			// other messages still need to be handled regardless (or, in some
			// cases, won't be recieved until after the pop-up has been
			// displayed, so this check only needs to be here).

			sendResponse(filterLandmarks())
			break
		case 'focus-landmark':
			// Triggered by clicking on an item in the pop-up, or indirectly
			// via one of the keyboard shortcuts (if landmarks are present)
			focusElement(message.index)
			break
		case 'next-landmark':
			// Triggered by keyboard shortcut
			adjacentLandmark(+1)
			break
		case 'prev-landmark':
			// Triggered by keyboard shortcut
			adjacentLandmark(-1)
			break
		case 'trigger-refresh':
			// On sites that use single-page style techniques to transition
			// (such as YouTube and GitHub) we monitor in the background script
			// for when the History API is used to update the URL of the page
			// (indicating that its content has changed substantially). When
			// this happens, we should treat it as a new page, and fetch
			// landmarks again when asked.
			removeBorderOnPreviouslySelectedElement()  // TODO rapid nav error
			g_gotLandmarks = false
			findLandmarks()
			sendUpdateBadgeMessage()
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
		landmarks: g_landmarkedElements.length
	})
}


//
// Content Script Entry Point
//

const attemptInterval = 1000
const maximumAttempts = 10
let landmarkFindingAttempts = 0

function bootstrap() {
	landmarkFindingAttempts += 1
	if (document.readyState === 'complete') {
		findLandmarks()
		sendUpdateBadgeMessage()
	} else if (landmarkFindingAttempts <= maximumAttempts) {
		console.log('Landmarks: document not ready; retrying. (Attempt ' +
			String(landmarkFindingAttempts) + ')')
		setTimeout(bootstrap, attemptInterval)
	} else {
		throw new Error('Landmarks: unable to find landmarks after ' +
			String(maximumAttempts) + 'attempts.')
	}
}

setTimeout(bootstrap, attemptInterval)
