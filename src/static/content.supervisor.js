'use strict'
/* global LandmarksFinder ElementFocuser PauseHandler */
const outOfDateTime = 2000
const logger = new Logger()
let observer = null

const lf = new LandmarksFinder(window, document)
const ef = new ElementFocuser()
const ph = new PauseHandler(logger)


//
// Log messages according to user setting
//

function Logger() {
	const that = this

	function getDebugInfoOption(callback) {
		browser.storage.sync.get({
			debugInfo: false
		}, function(items) {
			// We only define the log() function after successfully initing, so
			// as to trap any errant uses of the logger.
			handleOptionsChange({
				debugInfo: items.debugInfo
			})
			if (callback) {
				callback()
			}
		})
	}

	function handleOptionsChange(changes) {
		if (changes.hasOwnProperty('debugInfo')) {
			// Ensure the correct line number is reported
			// https://stackoverflow.com/a/32928812/1485308
			// https://stackoverflow.com/a/28668819/1485308
			if (changes.debugInfo) {
				that.log = console.log.bind(window.console)
			} else {
				that.log = function() {}
			}
		}
	}

	// We may wish to log messages right way, but the call to get the user
	// setting is asynchronous. Therefore, we need to pass our bootstrapping
	// code as a callback that is run when the option has been fetched.
	this.init = function(callback) {
		getDebugInfoOption(callback)
		browser.storage.onChanged.addListener(handleOptionsChange)
	}
}


//
// Extension message management
//

// Act on requests from the background or pop-up scripts
function messageHandler(message, sender, sendResponse) {
	switch (message.request) {
		case 'get-landmarks':
			// The pop-up is requesting the list of landmarks on the page
			handleOutdatedResults()
			sendResponse(lf.filter())
			break
		case 'focus-landmark':
			// Triggered by clicking on an item in the pop-up, or indirectly
			// via one of the keyboard shortcuts (if landmarks are present)
			handleOutdatedResults()
			checkFocusElement(() => lf.getLandmarkElement(message.index))
			break
		case 'next-landmark':
			// Triggered by keyboard shortcut
			handleOutdatedResults()
			checkFocusElement(lf.getNextLandmarkElement)
			break
		case 'prev-landmark':
			// Triggered by keyboard shortcut
			handleOutdatedResults()
			checkFocusElement(lf.getPreviousLandmarkElement)
			break
		case 'main-landmark': {
			handleOutdatedResults()
			const mainElement = lf.getMainElement()
			if (mainElement) {
				ef.focusElement(mainElement)
			} else {
				alert(browser.i18n.getMessage('noMainLandmarkFound') + '.')
			}
			break
		}
		case 'trigger-refresh':
			// On sites that use single-page style techniques to transition
			// (such as YouTube and GitHub) we monitor in the background script
			// for when the History API is used to update the URL of the page
			// (indicating that its content has changed substantially). When
			// this happens, we should treat it as a new page, and fetch
			// landmarks again when asked.
			logger.log('Landmarks: trigger-refresh')
			ef.removeBorderOnCurrentlySelectedElement()
			findLandmarksAndUpdateBadge()
			break
		default:
			throw Error('Landmarks: content script received unknown message: '
				+ message.request)
	}
}

function handleOutdatedResults() {
	if (ph.getPauseTime() > outOfDateTime) {
		logger.log(`Landmarks may be out of date (pause: ${ph.getPauseTime()}); scanning now...`)
		findLandmarksAndUpdateBadge()
	}
}

function checkFocusElement(callbackReturningElement) {
	if (lf.getNumberOfLandmarks() === 0) {
		alert(browser.i18n.getMessage('noLandmarksFound') + '.')
		return
	}

	ef.focusElement(callbackReturningElement())
}


//
// Actually finding landmarks
//

function findLandmarksAndUpdateBadge() {
	lf.find()
	sendUpdateBadgeMessage()
}

function sendUpdateBadgeMessage() {
	try {
		browser.runtime.sendMessage({
			request: 'update-badge',
			landmarks: lf.getNumberOfLandmarks()
		})
	} catch (error) {
		// The most likely error is that, on !Firefox this content script has
		// been retired because the extension was unloaded/reloaded. In which
		// case, we don't want to keep handling mutations.
		if (observer) {
			logger.log('Disconnecting observer from retired content script')
			observer.disconnect()
		} else {
			throw error
		}
	}
}


//
// Bootstrapping and mutation observer setup
//

function bootstrap() {
	logger.init(() => {
		logger.log('Bootstrapping Landmarks')
		logger.log(`Document state: ${document.readyState}`)
		findLandmarksAndUpdateBadge()
		setUpMutationObserver()
		browser.runtime.onMessage.addListener(messageHandler)
	})
}

function setUpMutationObserver() {
	observer = new MutationObserver((mutations) => {
		// Guard against being innundated by mutation events
		// (which happens in e.g. Google Docs)
		ph.run(
			function() {
				if (shouldRefreshLandmarkss(mutations)) {
					logger.log('SCAN mutation')
					findLandmarksAndUpdateBadge()
				}
			},
			findLandmarksAndUpdateBadge)
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

function shouldRefreshLandmarkss(mutations) {
	for (const mutation of mutations) {
		if (mutation.type === 'childList') {
			// Structural change
			for (const nodes of [mutation.addedNodes, mutation.removedNodes]) {
				for (const node of nodes) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						return true
					}
				}
			}
		} else {
			// Attribute change
			if (mutation.attributeName === 'style') {
				if (/display|visibility/.test(mutation.target.getAttribute('style'))) {
					return true
				}
				continue
			}

			// TODO: things that could be checked:
			//  * If it's a class change, check if it affects visiblity.
			//  * If it's a relevant change to the role attribute.
			//  * If it's a relevant change to aria-labelledby.
			//  * If it's a relevant change to aria-label.

			// For now, assume that any change is relevant, becuse it
			// could be.
			return true
		}
	}
	return false
}


//
// Entry point
//

bootstrap()
