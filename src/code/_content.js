import './compatibility'
import LandmarksFinder from './landmarksFinder'
import ElementFocuser from './elementFocuser'
import PauseHandler from './pauseHandler'
import Logger from './logger'
import BorderDrawer from './borderDrawer'
import ContrastChecker from './contrastChecker'

const logger = new Logger(window)
const landmarksFinder = new LandmarksFinder(window, document)
const contrastChecker = new ContrastChecker()
const borderDrawer = new BorderDrawer(window, document, contrastChecker)
const elementFocuser = new ElementFocuser(document, borderDrawer)
const pauseHandler = new PauseHandler(logger)

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
			sendingPort.postMessage({
				name: 'landmarks',
				data: landmarksFinder.filter()
			})
			break
		case 'focus-landmark':
			// Triggered by clicking on an item in a GUI, or indirectly via one
			// of the keyboard shortcuts (if landmarks are present)
			handleOutdatedResults()
			checkFocusElement(() =>
				landmarksFinder.getLandmarkElementRoleLabel(message.index))
			break
		case 'next-landmark':
			// Triggered by keyboard shortcut
			handleOutdatedResults()
			checkFocusElement(landmarksFinder.getNextLandmarkElementRoleLabel)
			break
		case 'prev-landmark':
			// Triggered by keyboard shortcut
			handleOutdatedResults()
			checkFocusElement(
				landmarksFinder.getPreviousLandmarkElementRoleLabel)
			break
		case 'main-landmark': {
			// Triggered by keyboard shortcut
			handleOutdatedResults()
			const mainElementInfo = landmarksFinder.getMainElementRoleLabel()
			if (mainElementInfo) {
				elementFocuser.focusElement(mainElementInfo)
			} else {
				alert(browser.i18n.getMessage('noMainLandmarkFound') + '.')
			}
			break
		}
		case 'toggle-all-landmarks':
			// Triggered by keyboard shortcut
			handleOutdatedResults()
			borderDrawer.addBorderToElements(
				landmarksFinder.allElementsRolesLabels())
			break
		case 'trigger-refresh':
			// On sites that use single-page style techniques to transition
			// (such as YouTube and GitHub) we monitor in the background script
			// for when the History API is used to update the URL of the page
			// (indicating that its content has changed substantially). When
			// this happens, we should treat it as a new page, and fetch
			// landmarks again when asked.
			logger.log('Landmarks: refresh triggered')
			elementFocuser.removeBorderOnCurrentlySelectedElement()
			findLandmarksAndUpdateBackgroundScript()
			break
		default:
			throw Error(`Unexpected message: ${JSON.stringify(message)}; sender: ${JSON.stringify(sendingPort)}`)
	}
}

function handleOutdatedResults() {
	if (pauseHandler.getPauseTime() > outOfDateTime) {
		logger.log(`Landmarks may be out of date (pause: ${pauseHandler.getPauseTime()}); scanning now...`)
		findLandmarksAndUpdateBackgroundScript()
	}
}

function checkFocusElement(callbackReturningElementInfo) {
	if (landmarksFinder.getNumberOfLandmarks() === 0) {
		alert(browser.i18n.getMessage('noLandmarksFound') + '.')
		return
	}

	elementFocuser.focusElement(callbackReturningElementInfo())
}


//
// Actually finding landmarks
//

function findLandmarksAndUpdateBackgroundScript() {
	logger.timeStamp('findLandmarksAndUpdateBackgroundScript()')
	landmarksFinder.find()
	port.postMessage({ name: 'landmarks', data: landmarksFinder.filter() })
	elementFocuser.refreshFocusedElement()
	borderDrawer.refreshBorders()
	// TODO check here if we need to add/remove toggled all landmark borders
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
		pauseHandler.run(
			// Ignore mutations if Landmarks caused them
			borderDrawer.hasMadeDOMChanges,
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
	logger.log(`Bootstrapping Landmarks content script in ${window.location}`)
	port = browser.runtime.connect({ name: 'content' })
	port.onDisconnect.addListener(function() {
		// If the port disconnected normally, then on Chrome-like browsers this
		// means the extension was unloaded and the content script has been
		// orphaned, so we should stop the mutation observer.
		//
		// If the port disconnected with an error, it's most likely to occur on
		// Firefox when the background script has not loaded and set up its
		// listener yet. In this case, we would desist and wait for the
		// background script to tell us we can try connecting to it again.
		// https://bugzilla.mozilla.org/show_bug.cgi?id=1474727#c3
		//
		// However, we don't need to check for an error on Firefox, because the
		// normal onDisconnect event is not received by content scripts when
		// they're cleaned up, therefore the behaviour is actually the same no
		// matter the browser on which we're running...
		logger.log(`Port disconnected from ${window.location}`)
		try {
			observer.disconnect()
			observer = null
		} catch (error) {
			logger.log(`Error whilst attempting to disconnect ${window.location} observer: ${error}`)
		}
	})
	port.onMessage.addListener(messageHandler)
	findLandmarksAndUpdateBackgroundScript()  // FIXME try removing
	setUpMutationObserver()
}

bootstrap()

if (BROWSER === 'firefox') {
	// Firefox doesn't re-inject content scripts attatched to pages from which
	// the user has moved away, but that haven't actually been destroyed yet.
	// Thanks https://bugzilla.mozilla.org/show_bug.cgi?id=1390715
	//
	// Unfortunately that doesn't work here; when it doesn't work, the
	// content script never receives this event in order to tell it to reload
	// the script.
	/* window.addEventListener('pageshow', function(event) {
		if (event.target !== window.document) return
		logger.log(`Page ${window.location} shown - re-booting...`)
		try {
			observer.disconnect()
			observer = null
			port.disconnect()
			port = null
		} catch (error) {
			logger.log(`Error whilst attempting to disconnect observer: ${error}`)
		}
		bootstrap()
	}) */

	// Firefox loads content scripts into existing tabs before the background
	// script, meaning that we may not have a background script to connect to
	// with the port. If that's the case, we have to wait for a workaround
	// message from the background script, to ask us to ry to connect.
	// Thanks https://bugzilla.mozilla.org/show_bug.cgi?id=1474727#c3
	browser.runtime.onMessage.addListener(function(message) {
		switch (message.name) {
			case 'FirefoxWorkaround':
				logger.log(`Background script requesting connection from ${window.location.href}`)
				bootstrap()
				break
			default:
				throw Error(`Unknown message ${message} received.`)
		}
	})
}
