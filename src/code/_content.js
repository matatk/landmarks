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

function messageHandler(message, sendingPort) {
	switch (message.name) {
		case 'get-landmarks':
			// A GUI is requesting the list of landmarks on the page
			handleOutdatedResults()
			sendingPort.postMessage({ name: 'landmarks', data: lf.filter() })
			break
		case 'focus-landmark':
			// Triggered by clicking on an item in a GUI, or indirectly via one
			// of the keyboard shortcuts (if landmarks are present)
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
			// Triggered by keyboard shortcut
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
	logger.log('Asking it to find landmarks...')  // TODO seems to happen too much -- possibly due to mutation observer?
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
	logger.log('Setting up mutation observer')
	observer = new MutationObserver((mutations) => {
		// Guard against being innundated by mutation events
		// (which happens in e.g. Google Docs)
		ph.run(
			ef.didJustMakeChanges,
			function() {
				if (shouldRefreshLandmarkss(mutations)) {
					logger.log('Scan due to mutation')
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

	function disconnectObserver() {
		observer.disconnect()
		observer = null
	}

	// Firefox doesn't guarantee that the background script will load first,
	// which means that this can fail with a 'receiving end does not exist'
	// error (<https://bugzilla.mozilla.org/show_bug.cgi?id=1474727>). Chrome
	// appears to avoid this problem.
	//
	// Note: the code is kept the same cross-browser to keep it simpler and
	//       because it might provide some helpful error-checking.

	function tryToConnectAndSendLandmarks() {
		connectionAttempts += 1
		logger.log(`Connection attempt ${connectionAttempts}`)
		port = browser.runtime.connect({ name: 'content' })

		port.onDisconnect.addListener(function(disconnectingPort) {
			try {
				disconnectingPortErrorCheck(disconnectingPort)

				// If the port disconnected normally, then on Chrome-like
				// browsers this means that the extension was unloaded and the
				// content script has been orphaned, so we should stop the
				// mutation observer.
				logger.log('Disconnecting observer in retired content script')
				disconnectObserver()
			} catch (error) {
				// The port disconnected with an error. This is most likely to
				// occur on Firefox when the background script has not loaded
				// and set up its listener yet.
				if (connectionAttempts < maxConnectionAttempts) {
					logger.log('Connection failure; retrying')
					port = null
					setTimeout(tryToConnectAndSendLandmarks, 100)
				} else {
					// Can't think of when this might happen, but if we've
					// repeatedly tried and failed to connect on Firefox, then
					// we should stop mutation observing there too.
					logger.log('Failed to connect; stopping mutation observer')
					disconnectObserver()
				}
			}
		})

		port.onMessage.addListener(messageHandler)
		findLandmarksAndUpdateBackgroundScript()
	}

	tryToConnectAndSendLandmarks()
	setUpMutationObserver()
}

bootstrap()
