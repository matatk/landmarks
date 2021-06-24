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
const contrastChecker = new ContrastChecker()
const borderDrawer = new BorderDrawer(window, document, contrastChecker)
const elementFocuser = new ElementFocuser(document, borderDrawer)
const msr = new MutationStatsReporter()
const pauseHandler = new PauseHandler(msr.setPauseTime)
const noop = () => {}

const observerReconnectionGrace = 2e3  // wait after page becomes visible again
let observerReconnectionScanTimer = null
let observer = null
let landmarksFinder = null
let haveScannedForLandmarks = false


//
// Extension message management
//

function messageHandler(message) {
	if (DEBUG && message.name !== 'debug') debugSend(`rx: ${message.name}`)
	switch (message.name) {
		case 'get-landmarks':
			// A GUI is requesting the list of landmarks on the page
			if (!doUpdateOutdatedResults()) sendLandmarks()
			break
		case 'focus-landmark':
			// Triggered by activating an item in a GUI, or indirectly via one
			// of the keyboard shortcuts (if landmarks are present)
			doUpdateOutdatedResults()
			guiCheckFocusElement(() =>
				landmarksFinder.getLandmarkElementInfo(message.index))
			break
		case 'next-landmark':
			// Triggered by keyboard shortcut
			doUpdateOutdatedResults()
			guiCheckFocusElement(landmarksFinder.getNextLandmarkElementInfo)
			break
		case 'prev-landmark':
			// Triggered by keyboard shortcut
			doUpdateOutdatedResults()
			guiCheckFocusElement(
				landmarksFinder.getPreviousLandmarkElementInfo)
			break
		case 'main-landmark': {
			// Triggered by keyboard shortcut
			doUpdateOutdatedResults()
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
			doUpdateOutdatedResults()
			if (guiCheckThereAreLandmarks()) {
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
			pauseHandler.reset()
			elementFocuser.clear()
			borderDrawer.removeAllBorders()
			findLandmarksAndSend(
				// TODO: this willl send the non-mutation message twice
				msr.incrementNonMutationScans, msr.sendAllUpdates)
			// haveScannedForLandmarks will be set to true now anyway
			break
		case 'devtools-state':
			if (message.state === 'open') {
				if (landmarksFinder !== landmarksFinderDeveloper) {
					debugSend('change scanner to dev')
					landmarksFinder = landmarksFinderDeveloper
				} else {
					// TODO: Remove eventually
					console.error('Landmarks: already using dev scanner')
				}
				msr.beVerbose()
			} else {
				if (landmarksFinder !== landmarksFinderStandard) {
					debugSend('change scanner to standard')
					landmarksFinder = landmarksFinderStandard
				} else {
					// TODO: Remove eventually
					console.error('Landmarks: already using standard scanner')
				}
				msr.beQuiet()
			}
			if (!document.hidden) {
				debugSend('doc visible; also scanning')
				findLandmarks(noop, noop)
			}
			break
		case 'get-page-warnings':
			browser.runtime.sendMessage({
				name: 'page-warnings',
				data: landmarksFinder.pageResults()
			})
	}
}

function doUpdateOutdatedResults() {
	let outOfDate = false
	if (observerReconnectionScanTimer !== null && !haveScannedForLandmarks) {
		debugSend('out-of-date: no scan yet + waiting to observe')
		cancelObserverReconnectionScan()
		observeMutations()
		outOfDate = true
	} else if (pauseHandler.isPaused()) {
		debugSend('out-of-date: scanning pause > default')
		outOfDate = true
	}

	if (outOfDate === true) {
		findLandmarksAndSend(
			msr.incrementNonMutationScans,
			noop)  // it already calls the send function
		return true
	}
	debugSend('landmarks are up-to-date')
	return false
}

function guiCheckThereAreLandmarks() {
	if (landmarksFinder.getNumberOfLandmarks() === 0) {
		alert(browser.i18n.getMessage('noLandmarksFound'))
		return false
	}
	return true
}

function guiCheckFocusElement(callbackReturningElementInfo) {
	if (guiCheckThereAreLandmarks()) {
		elementFocuser.focusElement(callbackReturningElementInfo())
	}
}

function debugSend(what) {
	// When sending from a contenet script, the tab's ID will be noted by the
	// background script, so no need to specify a 'from' key here.
	browser.runtime.sendMessage({ name: 'debug', info: what })
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

function findLandmarks(counterIncrementFunction, updateSendFunction) {
	if (DEBUG) console.timeStamp(`findLandmarks() on ${window.location.href}`)
	debugSend('finding landmarks')

	const start = performance.now()
	landmarksFinder.find()
	if (!haveScannedForLandmarks) haveScannedForLandmarks = true
	msr.setLastScanDuration(performance.now() - start)

	counterIncrementFunction()
	updateSendFunction()

	elementFocuser.refreshFocusedElement()
	borderDrawer.refreshBorders()
	if (!elementFocuser.isManagingBorders()) {
		borderDrawer.replaceCurrentBordersWithElements(
			landmarksFinder.allElementsInfos())
	}
}

function findLandmarksAndSend(counterIncrementFunction, updateSendFunction) {
	findLandmarks(counterIncrementFunction, updateSendFunction)
	sendLandmarks()
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
					debugSend('scanning due to mutation')
					findLandmarksAndSend(msr.incrementMutationScans, noop)
					// msr.sendMutationUpdate() called below
				}
			},
			// Scheduled task
			function() {
				debugSend('scheduled scan')
				findLandmarksAndSend(
					msr.incrementMutationScans, msr.sendMutationUpdate)
			})

		msr.sendMutationUpdate()
	})
}

function observeMutations() {
	debugSend('observing mutations')
	observer.observe(document, {
		attributes: true,
		childList: true,
		subtree: true,
		attributeFilter: [
			'class', 'style', 'hidden', 'role', 'aria-labelledby', 'aria-label'
		]
	})
}

function cancelObserverReconnectionScan() {
	if (observerReconnectionScanTimer) {
		debugSend('cancelling scheduled observing and scan')
		clearTimeout(observerReconnectionScanTimer)
		observerReconnectionScanTimer = null
	}
}

function reflectPageVisibility() {
	debugSend((document.hidden ? 'hidden' : 'shown') + ' ' + window.location)
	if (document.hidden) {
		cancelObserverReconnectionScan()
		debugSend('disconnecting from observer')
		observer.disconnect()
	} else {
		debugSend('starting reconnection timer')
		observerReconnectionScanTimer = setTimeout(function() {
			debugSend('scheduled observing and scan')
			findLandmarksAndSend(
				msr.incrementNonMutationScans, noop)  // it will send anyway
			observeMutations()
			observerReconnectionScanTimer = null
		}, observerReconnectionGrace)
	}
}

function bootstrap() {
	debugSend(`starting - ${window.location}`)
	browser.runtime.onMessage.addListener(messageHandler)

	if (BROWSER !== 'firefox') {
		browser.runtime.connect({ name: 'disconnect-checker' })
			.onDisconnect.addListener(function() {
				console.log('Landmarks: content script disconnected due to extension unload/reload.')
				observer.disconnect()
				document.removeEventListener('visibilitychange', reflectPageVisibility, false)
			})
	}

	createMutationObserver()
	// Requesting the DevTools' state will eventually cause the correct scanner
	// to be set, and the document to be scanned, if visible.
	browser.runtime.sendMessage({ name: 'get-devtools-state' })
	document.addEventListener('visibilitychange', reflectPageVisibility, false)
}

bootstrap()
