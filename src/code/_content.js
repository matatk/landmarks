import './compatibility'
import LandmarksFinder from './landmarksFinder'
import ElementFocuser from './elementFocuser'
import PauseHandler from './pauseHandler'
import Logger from './logger'
import disconnectingPortErrorCheck from './disconnectingPortErrorCheck'

const logger = new Logger()
const lf = new LandmarksFinder(window, document)
const ef = new ElementFocuser()
const ph = new PauseHandler(logger)

const outOfDateTime = 2000
let observer = null
let port = null


//
// Extension message management
//

// FIXME remove sendingPort; use port?
// Act on requests from the background or pop-up scripts
function messageHandler(message, sendingPort) {
	console.log(`content script rx'd ${message.name}`)
	switch (message.name) {
		case 'get-landmarks':
			// FIXME should this do lf.find() first? what did it used to do? compare this behaviour to findLandmarksAndUpdateBackgroundScript()
			// FIXME should this even be supported anymore?
			// The pop-up is requesting the list of landmarks on the page
			handleOutdatedResults()
			sendingPort.postMessage({ name: 'landmarks', data: lf.filter() })
			break
		case 'focus-landmark':
			// Triggered by clicking on an item in the pop-up, or indirectly
			// via one of the keyboard shortcuts (if landmarks are present)
			handleOutdatedResults()
			checkFocusElement(
				() => lf.getLandmarkElementRoleLabel(message.index))
			break
		case 'next-landmark':
			// Triggered by keyboard shortcut
			handleOutdatedResults()
			checkFocusElement(lf.getNextLandmarkElementRoleLabel)
			break
		case 'prev-landmark':
			// Triggered by keyboard shortcut
			handleOutdatedResults()
			checkFocusElement(lf.getPreviousLandmarkElementRoleLabel)
			break
		case 'main-landmark': {
			handleOutdatedResults()
			const mainElementInfo = lf.getMainElementRoleLabel()
			if (mainElementInfo) {
				ef.focusElement(mainElementInfo)
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
			logger.log('Landmarks: refresh triggered')
			ef.removeBorderOnCurrentlySelectedElement()
			findLandmarksAndUpdateBackgroundScript()
			break
		default:
			throw Error(`Unexpected message: ${JSON.stringify(message)}; sender: ${JSON.stringify(sendingPort)}`)
	}
}

function handleOutdatedResults() {
	if (ph.getPauseTime() > outOfDateTime) {
		logger.log(`Landmarks may be out of date (pause: ${ph.getPauseTime()}); scanning now...`)
		findLandmarksAndUpdateBackgroundScript()
	}
}

function checkFocusElement(callbackReturningElementInfo) {
	if (lf.getNumberOfLandmarks() === 0) {
		alert(browser.i18n.getMessage('noLandmarksFound') + '.')
		return
	}

	ef.focusElement(callbackReturningElementInfo())
}


//
// Actually finding landmarks
//

function findLandmarksAndUpdateBackgroundScript() {
	lf.find()
	port.postMessage({ name: 'landmarks', data: lf.filter() })
}


//
// Bootstrapping and mutation observer setup
//

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

function setUpMutationObserver() {
	observer = new MutationObserver((mutations) => {
		// Guard against being innundated by mutation events
		// (which happens in e.g. Google Docs)
		ph.run(
			ef.didJustMakeChanges,
			function() {
				if (shouldRefreshLandmarkss(mutations)) {
					logger.log('SCAN mutation')
					findLandmarksAndUpdateBackgroundScript()
				}
			},
			findLandmarksAndUpdateBackgroundScript)
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

function bootstrap() {
	const maxConnectionAttempts = 10
	let connectionAttempts = 0

	logger.log('Bootstrapping Landmarks content script')

	// FIXME comment
	// Rather interesting: having this as a global variable borks it on
	// Firefox; it seems to try to connect to the background page before
	// the background page is ready for connections.

	function tryToConnectAndSendLandmarks() {
		connectionAttempts += 1
		console.log(`Content script connection attempt ${connectionAttempts}`)
		port = browser.runtime.connect({ name: 'content' })

		port.onMessage.addListener(messageHandler)

		port.onDisconnect.addListener(function(disconnectingPort) {
			if (connectionAttempts < maxConnectionAttempts) {
				try {
					disconnectingPortErrorCheck(disconnectingPort)
				} catch (error) {
					console.log('Connection error; trying again...')
					port = null
					setTimeout(tryToConnectAndSendLandmarks, 100)
				}
			} else {
				logger.log('Disconnecting observer from retired content script')
				observer.disconnect()
				observer = null
			}
		})

		findLandmarksAndUpdateBackgroundScript()
	}

	tryToConnectAndSendLandmarks()
	setUpMutationObserver()
}

bootstrap()
