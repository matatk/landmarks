import './compatibility'
import LandmarksFinder from './landmarksFinder'
import ElementFocuser from './elementFocuser'
import PauseHandler from './pauseHandler'
import BorderDrawer from './borderDrawer'
import ContrastChecker from './contrastChecker'
import MutationStatsReporter from './mutationStatsReporter'

const landmarksFinder = new LandmarksFinder(window, document)
const contrastChecker = new ContrastChecker()
const borderDrawer = new BorderDrawer(window, document, contrastChecker)
const elementFocuser = new ElementFocuser(document, borderDrawer)
const msr = new MutationStatsReporter()
const pauseHandler = new PauseHandler(msr.setPauseTime)

const outOfDateTime = 2e3
const observerReconnectionGrace = 1e3
let observer = null
let observerReconnectionTimer = null


//
// Extension message management
//

function messageHandler(message, sender, sendResponse) {
	switch (message.name) {
		case 'get-landmarks':
			// A GUI is requesting the list of landmarks on the page
			if (!checkAndUpdateOutdatedResults()) sendLandmarks()
			break
		case 'focus-landmark':
			// Triggered by activating an item in a GUI, or indirectly via one
			// of the keyboard shortcuts (if landmarks are present)
			checkAndUpdateOutdatedResults()
			checkFocusElement(() =>
				landmarksFinder.getLandmarkElementInfo(message.index))
			break
		case 'next-landmark':
			// Triggered by keyboard shortcut
			checkAndUpdateOutdatedResults()
			checkFocusElement(landmarksFinder.getNextLandmarkElementInfo)
			break
		case 'prev-landmark':
			// Triggered by keyboard shortcut
			checkAndUpdateOutdatedResults()
			checkFocusElement(
				landmarksFinder.getPreviousLandmarkElementInfo)
			break
		case 'main-landmark': {
			// Triggered by keyboard shortcut
			checkAndUpdateOutdatedResults()
			const mainElementInfo = landmarksFinder.getMainElementInfo()
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
					borderDrawer.replaceCurrentBordersWithElements(
						landmarksFinder.allElementsInfos())
				} else {
					borderDrawer.removeAllBorders()
					elementFocuser.manageBorders(true)
				}
			}
			// eslint-disable-next-line no-fallthrough
		case 'get-toggle-state':
			browser.runtime.sendMessage({
				name: 'toggle-state-is',
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
			msr.reset()
			elementFocuser.clear()
			borderDrawer.removeAllBorders()
			findLandmarksAndUpdateExtension()
			msr.sendAllUpdates()
			break
		case 'devtools-state':
			if (message.state === 'open') {
				msr.beVerbose()
			} else {
				msr.beQuiet()
			}
			break
		case 'are-you-there':
			sendResponse('cake')
			return
	}

	// Alas this is required because we need to be able to check the response
	// sent by the content script to see if it needs being injected, which
	// means we have to respond to every message.
	sendResponse(true)
}

function checkAndUpdateOutdatedResults() {
	if (pauseHandler.getPauseTime() > outOfDateTime) {
		findLandmarksAndUpdateExtension()
		msr.sendMutationUpdate()
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
// Finding landmarks
//

function sendLandmarks() {
	browser.runtime.sendMessage({
		name: 'landmarks',
		data: landmarksFinder.allInfos()
	})
}

function findLandmarksAndUpdateExtension() {
	if (DEBUG) console.timeStamp(`findLandmarksAndUpdateExtension() on ${window.location.href}`)
	const start = performance.now()
	landmarksFinder.find()
	msr.setLastScanDuration(performance.now() - start)
	msr.incrementMutationScans()
	sendLandmarks()
	elementFocuser.refreshFocusedElement()
	borderDrawer.refreshBorders()
	if (!elementFocuser.isManagingBorders()) {
		borderDrawer.replaceCurrentBordersWithElements(
			landmarksFinder.allElementsInfos())
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

function createMutationObserver() {
	observer = new MutationObserver(function(mutations) {
		msr.incrementTotalMutations()

		// Guard against being innundated by mutation events
		// (which happens in e.g. Google Docs)
		pauseHandler.run(
			// Ignore border-drawing mutations
			borderDrawer.hasMadeDOMChanges,
			// Guarded task
			function() {
				msr.incrementCheckedMutations()
				if (shouldRefreshLandmarkss(mutations)) {
					findLandmarksAndUpdateExtension()
					// msr.sendMutationUpdate() called below
				}
			},
			// Scheduled task
			function() {
				findLandmarksAndUpdateExtension()
				msr.sendMutationUpdate()
			})

		msr.sendMutationUpdate()
	})
}

function observeMutationObserver() {
	observer.observe(document, {
		attributes: true,
		childList: true,
		subtree: true,
		attributeFilter: [
			'class', 'style', 'hidden', 'role', 'aria-labelledby', 'aria-label'
		]
	})
}

function observeMutationObserverAndFindLandmarks() {
	observeMutationObserver()
	findLandmarksAndUpdateExtension()
	msr.sendMutationUpdate()
}

function reflectPageVisibility() {
	if (document.hidden) {
		if (observerReconnectionTimer) {
			clearTimeout(observerReconnectionTimer)
			observerReconnectionTimer = null
		}
		observer.disconnect()
	} else {
		observerReconnectionTimer = setTimeout(function() {
			observeMutationObserverAndFindLandmarks()
			observerReconnectionTimer = null
		}, observerReconnectionGrace)
	}
}

function bootstrap() {
	browser.runtime.onMessage.addListener(messageHandler)

	if (BROWSER !== 'firefox') {
		browser.runtime.connect({ name: 'disconnect-checker' })
			.onDisconnect.addListener(function() {
				console.log('Landmarks: content script disconnected due to extension unload/reload.')
				observer.disconnect()
				document.removeEventListener('visibilitychange', reflectPageVisibility, false)
			})
	}

	// At the start, the ElementFocuser is always managing borders
	browser.runtime.sendMessage({ name: 'toggle-state-is', data: 'selected' })
	createMutationObserver()
	observeMutationObserverAndFindLandmarks()
	document.addEventListener('visibilitychange', reflectPageVisibility, false)
	browser.runtime.sendMessage({ name: 'get-devtools-state' })
}

bootstrap()
