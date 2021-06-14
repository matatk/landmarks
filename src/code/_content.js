import './compatibility'
import LandmarksFinderStandard from './landmarksFinderStandard'
import LandmarksFinderDeveloper from './landmarksFinderDeveloper'
import ElementFocuser from './elementFocuser'
import PauseHandler from './pauseHandler'
import BorderDrawer from './borderDrawer'
import ContrastChecker from './contrastChecker'
import MutationStatsReporter from './mutationStatsReporter'

const landmarksFinderStandard = new LandmarksFinderStandard(window, document)
const landmarksFinderDeveloper = new LandmarksFinderDeveloper(window, document)
let landmarksFinder = landmarksFinderStandard
const contrastChecker = new ContrastChecker()
const borderDrawer = new BorderDrawer(window, document, contrastChecker)
const elementFocuser = new ElementFocuser(document, borderDrawer)
const msr = new MutationStatsReporter()
const pauseHandler = new PauseHandler(msr.setPauseTime)

const outOfDateTime = 2e3              // consider landmarks stale after this
const observerReconnectionGrace = 1e3  // wait after page becomes visible again
let observer = null
let observerReconnectionTimer = null


//
// Extension message management
//

function messageHandler(message) {
	switch (message.name) {
		case 'get-landmarks':
			// A GUI is requesting the list of landmarks on the page
			debugSend('servicing-get-landmarks-request')
			if (!checkAndUpdateOutdatedResults()) {
				debugSend('servicing-get-landmarks-request-already-up-to-date-so-just-sending-landmarks-as-is')
				sendLandmarks()
			} else {
				debugSend('servicing-get-landmarks-request-refreshed-and-sent-newly-found-landmarks')
			}
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
			if (checkThereAreLandmarks()) {
				if (elementFocuser.isManagingBorders()) {
					elementFocuser.manageBorders(false)
					borderDrawer.replaceCurrentBordersWithElements(
						landmarksFinder.allElementsInfos())
				} else {
					borderDrawer.removeAllBorders()
					elementFocuser.manageBorders(true)
				}
			}
			// eslint-disable-this-line no-fallthrough
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
				debugSend('content-change-to-dev')
				if (landmarksFinder !== landmarksFinderDeveloper) {
					landmarksFinder = landmarksFinderDeveloper
					landmarksFinder.find()
				} else {
					debugSend('content-was-already-dev')
				}
				msr.beVerbose()
			} else {
				debugSend('content-change-to-standard')
				if (landmarksFinder !== landmarksFinderStandard) {
					landmarksFinder = landmarksFinderStandard
					landmarksFinder.find()
				} else {
					debugSend('content-was-already-standard')
				}
				msr.beQuiet()
			}
			break
		case 'get-page-warnings':
			browser.runtime.sendMessage({
				name: 'page-warnings',
				data: landmarksFinder.pageResults()
			})
	}
}

function checkAndUpdateOutdatedResults() {
	if (pauseHandler.getPauseTime() > outOfDateTime) {
		findLandmarksAndUpdateExtension()
		msr.sendMutationUpdate()
		return true
	}
	return false
}

function checkThereAreLandmarks() {
	if (landmarksFinder.getNumberOfLandmarks() === 0) {
		alert(browser.i18n.getMessage('noLandmarksFound'))
		return false
	}
	return true
}

function checkFocusElement(callbackReturningElementInfo) {
	if (checkThereAreLandmarks()) {
		elementFocuser.focusElement(callbackReturningElementInfo())
	}
}

// This is stripped by the build script when not in debug mode
function debugSend(messageName) {
	browser.runtime.sendMessage({ name: messageName })
}


//
// Finding landmarks
//

function sendLandmarks() {
	debugSend('sendLandmarks')
	browser.runtime.sendMessage({
		name: 'landmarks',
		data: landmarksFinder.allInfos()
	})
}

function findLandmarksAndUpdateExtension() {
	if (DEBUG) console.timeStamp(`findLandmarksAndUpdateExtension() on ${window.location.href}`)
	debugSend('found-landmarks')
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
	debugSend('doc-hidden-' + document.hidden)
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
	debugSend('content-script-BOOTING')
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
	// TODO: Background script will ask for this after webNavigation
	// browser.runtime.sendMessage({ name: 'toggle-state-is', data: 'selected' })

	createMutationObserver()
	debugSend('content-script-observing')
	// TODO: Background script will ask for this after webNavigation
	// observeMutationObserverAndFindLandmarks()
	observeMutationObserver()

	document.addEventListener('visibilitychange', reflectPageVisibility, false)
	browser.runtime.sendMessage({ name: 'get-devtools-state' })
	debugSend('content-script-booted')
}

bootstrap()
