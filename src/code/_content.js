// FIXME: need to store whether we're awaiting a scheduled scan? or does isPaused already handle this?
// FIXME: send only number of landmarks after a mutation?
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

const observerReconnectionGrace = 1e3  // wait after page becomes visible again
let observer = null
let observerReconnectionTimer = null

const noop = () => {}


//
// Extension message management
//

function messageHandler(message) {
	// TODO check this is removed properly in normal builds
	if (message.name !== 'debug') debugSend(`got: ${message.name}`)
	switch (message.name) {
		case 'get-landmarks':
			// A GUI is requesting the list of landmarks on the page
			if (!checkAndUpdateOutdatedResults()) {
				sendLandmarks()
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
			findLandmarksAndSend(
				// TODO: this willl send the non-mutation message twice
				msr.incrementNonMutationScans, msr.sendAllUpdates)
			break
		case 'devtools-state':
			if (message.state === 'open') {
				if (landmarksFinder !== landmarksFinderDeveloper) {
					debugSend('change scanner to dev')
					landmarksFinder = landmarksFinderDeveloper
					findLandmarks(noop, noop)
				} else {
					debugSend('scanner was already dev')
				}
				msr.beVerbose()
			} else {
				if (landmarksFinder !== landmarksFinderStandard) {
					debugSend('change scanner to standard')
					landmarksFinder = landmarksFinderStandard
					findLandmarks(noop, noop)
				} else {
					debugSend('scanner was already standard')
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
	if (pauseHandler.isPaused()) {
		debugSend('paused - re-finding landmarks')
		findLandmarksAndSend(
			msr.incrementNonMutationScans,
			noop)  // it already calls the send function
		return true
	}
	debugSend('not paused - landmarks are up-to-date')
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

function reflectPageVisibility() {
	debugSend((document.hidden ? 'hidden' : 'shown') + ' ' + window.location)
	if (document.hidden) {
		if (observerReconnectionTimer) {
			debugSend('clearing reconnection timer')
			clearTimeout(observerReconnectionTimer)
			observerReconnectionTimer = null
		}
		debugSend('disconnecting from observer')
		observer.disconnect()
	} else {
		// The user may be switching rapidly through tabs, so we have a grace
		// period before reconnecting to the observer.
		debugSend('starting reconnection timer')
		observerReconnectionTimer = setTimeout(function() {
			debugSend('starting to observe')
			observeMutationObserver()
			observerReconnectionTimer = null
		}, observerReconnectionGrace)
	}
}

function bootstrap() {
	debugSend(`booting - ${window.location}`)
	browser.runtime.onMessage.addListener(messageHandler)

	if (BROWSER !== 'firefox') {
		browser.runtime.connect({ name: 'disconnect-checker' })
			.onDisconnect.addListener(function() {
				console.log('Landmarks: content script disconnected due to extension unload/reload.')
				observer.disconnect()
				document.removeEventListener('visibilitychange', reflectPageVisibility, false)
			})
	}

	debugSend('initial scan')
	findLandmarks(
		msr.incrementNonMutationScans,
		noop) // it already calls the send function

	debugSend('creating observer')
	createMutationObserver()

	// On browser load (i.e. if we are currently invisible) DevTools will never
	// count as being open.
	if (!document.hidden) {
		observeMutationObserver()
		debugSend('visible: started observing for first time')
		debugSend('visible: asking about devtools')
		browser.runtime.sendMessage({ name: 'get-devtools-state' })
	} else {
		debugSend('hidden: not starting to observe')
		debugSend('hidden: not asking about devtools')
	}

	document.addEventListener('visibilitychange', reflectPageVisibility, false)
	debugSend('booted')
}

bootstrap()
