import './compatibility'
import LandmarksFinder from './landmarksFinder'
import ElementFocuser from './elementFocuser'
import PauseHandler from './pauseHandler'
import Logger from './logger'
import BorderDrawer from './borderDrawer'
import ContrastChecker from './contrastChecker'
import unexpectedMessageFromSenderError from './unexpectedMessageFromSenderError'

const logger = new Logger(window)
const landmarksFinder = new LandmarksFinder(window, document)
const contrastChecker = new ContrastChecker()
const borderDrawer = new BorderDrawer(window, document, contrastChecker)
const elementFocuser = new ElementFocuser(document, borderDrawer)
const pauseHandler = new PauseHandler(logger)

const outOfDateTime = 2000
let observer = null


//
// Extension message management
//

function messageHandler(message, sender) {  // also sendResponse
	switch (message.name) {
		case 'get-landmarks':
			// A GUI is requesting the list of landmarks on the page
			if (!checkAndUpdateOutdatedResults()) sendLandmarks()
			break
		case 'focus-landmark':
			// Triggered by clicking on an item in a GUI, or indirectly via one
			// of the keyboard shortcuts (if landmarks are present)
			checkAndUpdateOutdatedResults()
			checkFocusElement(() =>
				landmarksFinder.getLandmarkElementRoleLabel(message.index))
			break
		case 'next-landmark':
			// Triggered by keyboard shortcut
			checkAndUpdateOutdatedResults()
			checkFocusElement(landmarksFinder.getNextLandmarkElementRoleLabel)
			break
		case 'prev-landmark':
			// Triggered by keyboard shortcut
			checkAndUpdateOutdatedResults()
			checkFocusElement(
				landmarksFinder.getPreviousLandmarkElementRoleLabel)
			break
		case 'main-landmark': {
			// Triggered by keyboard shortcut
			checkAndUpdateOutdatedResults()
			const mainElementInfo = landmarksFinder.getMainElementRoleLabel()
			if (mainElementInfo) {
				elementFocuser.focusElement(mainElementInfo)
			} else {
				alert(browser.i18n.getMessage('noMainLandmarkFound'))
			}
			break
		}
		case 'toggle-all-landmarks':
			// Triggered by keyboard shortcut
			checkAndUpdateOutdatedResults()
			if (thereMustBeLandmarks()) {
				if (elementFocuser.isManagingBorders()) {
					elementFocuser.manageBorders(false)
					borderDrawer.addBorderToElements(
						landmarksFinder.allElementsRolesLabels())
				} else {
					borderDrawer.removeAllBorders()
					elementFocuser.manageBorders(true)
				}
			}
			// eslint-disable-next-line no-fallthrough
		case 'get-toggle-state':
			browser.runtime.sendMessage({
				name: 'toggle-state',
				data: elementFocuser.isManagingBorders() ? 'selected' : 'all'
			})
			break
		case 'trigger-refresh':
			// On sites that use single-page style techniques to transition
			// (such as YouTube and GitHub) we monitor in the background script
			// for when the History API is used to update the URL of the page
			// (indicating that its content has changed substantially). When
			// this happens, we should treat it as a new page, and fetch
			// landmarks again when asked.
			logger.log('Landmarks: refresh triggered')
			elementFocuser.clear()
			borderDrawer.removeAllBorders()
			findLandmarksAndUpdateExtension()
			break
		// This shouldn't happen
		case 'landmarks':
			// FIXME
			break
		default:
			throw unexpectedMessageFromSenderError(message, sender)
	}
}

function checkAndUpdateOutdatedResults() {
	if (pauseHandler.getPauseTime() > outOfDateTime) {
		logger.log(`Landmarks may be out of date (pause: ${pauseHandler.getPauseTime()}); scanning now...`)
		findLandmarksAndUpdateExtension()
		return true
	}
	return false
}

function thereMustBeLandmarks() {
	if (landmarksFinder.getNumberOfLandmarks() === 0) {
		alert(browser.i18n.getMessage('noLandmarksFound'))
		return false
	}
	return true
}

function checkFocusElement(callbackReturningElementInfo) {
	if (thereMustBeLandmarks()) {
		elementFocuser.focusElement(callbackReturningElementInfo())
	}
}


//
// Actually finding landmarks
//

function sendLandmarks() {
	// This may throw an error, e.g. if the background script hasn't loaded yet
	// on Firefox, but it's not one we can catch.
	browser.runtime.sendMessage({
		name: 'landmarks',
		data: landmarksFinder.allDepthsRolesLabelsSelectors()
	})
}

function findLandmarksAndUpdateExtension() {
	logger.timeStamp('findLandmarksAndUpdateExtension()')
	landmarksFinder.find()
	sendLandmarks()
	elementFocuser.refreshFocusedElement()
	borderDrawer.refreshBorders()
	if (!elementFocuser.isManagingBorders()) {
		borderDrawer.addBorderToElements(
			landmarksFinder.allElementsRolesLabels())
	}
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
					findLandmarksAndUpdateExtension()
				}
			},
			findLandmarksAndUpdateExtension)
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
	browser.runtime.onMessage.addListener(messageHandler)

	// At the start, the ElementFocuser is always managing borders
	browser.runtime.sendMessage({ name: 'toggle-state', data: 'selected' })
	findLandmarksAndUpdateExtension()  // TODO try removing
	setUpMutationObserver()
}

bootstrap()
