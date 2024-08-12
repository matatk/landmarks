// FIXME: Go back and use binding (or arrow funcs) to un-redirect event listener adding
import './compatibility'
import LandmarksFinder from './landmarksFinder.js'
import ElementFocuser from './elementFocuser.js'
import PauseHandler from './pauseHandler.js'
import BorderDrawer from './borderDrawer.js'
import ContrastChecker from './contrastChecker.js'
import MutationStatsReporter from './mutationStatsReporter.js'
import { defaultFunctionalSettings, defaultBorderSettings } from './defaults.js'

const landmarksFinder = new LandmarksFinder(window)
const contrastChecker = new ContrastChecker()
const borderDrawer = new BorderDrawer(contrastChecker)
const elementFocuser = new ElementFocuser(borderDrawer)
const msr = new MutationStatsReporter()
const pauseHandler = new PauseHandler((pause: number) => msr.setPauseTime(pause))
// FIXME find another way
// eslint-disable-next-line
const noop = () => {}

const observerReconnectionGrace = 2e3  // wait after page becomes visible again
let observerReconnectionScanTimer: ReturnType<typeof setTimeout> | null = null
let observer: MutationObserver | null = null
const highlightLastTouchTimes = new Map<number, number>()
const highlightTimeouts = new Map<number, ReturnType<typeof setTimeout>>()
const LIMITER = 350

let handleMutationsViaTree = null

// NOTE: Thank you https://timon.la/blog/background-script-message-typing/ :-)
// FIXME: make it elegant when payload is 'null'
// FIXME: DRY
const sendMessage = <T extends FromContentMessageTypes>(name: T, payload: FromContentMessagePayload<T>): void => {
	chrome.runtime.sendMessage({ name, payload }).catch(err => {
		throw err 
	})
}


//
// Extension message management
//

function handleHighlightMessage(index: number, action: () => void) {
	browser.storage.sync.get(defaultBorderSettings, function(items) {
		if (!elementFocuser.isManagingBorders() ||
			(items.borderType === 'persistent' &&
			landmarksFinder.getCurrentlySelectedIndex() === index)) return
		handleHighlightMessageCore(index, action)
	})
}

function handleHighlightMessageCore(index: number, action: () => void) {
	const now = performance.now()
	const elapsed = now - (highlightLastTouchTimes.get(index) ?? 0)
	clearTimeout(highlightTimeouts.get(index))
	if (elapsed > LIMITER) {
		action()
		highlightLastTouchTimes.set(index, now)
	} else {
		const timeout = setTimeout(() => {
			action()
			highlightLastTouchTimes.set(index, performance.now())
		}, LIMITER - elapsed)
		highlightTimeouts.set(index, timeout)
	}
}

function isDebugMessage(message: unknown): message is DebugMessage {
	// @ts-expect-error FIXME
	return Object.hasOwn(message, 'from') && message.name === 'debug'
}

// FIXME: DRY?
// NOTE: Thank you https://matiashernandez.dev/blog/post/typescript-create-a-union-from-a-type or https://effectivetypescript.com/2020/05/12/unionize-objectify/ for the basis of this :-).
type ForContent = {
	[k in keyof ForContentMessages]: {
		name: k,
		payload: ForContentMessages[k] extends { payload: unknown }
			? ForContentMessages[k]['payload']
			: null
	}
}[keyof ForContentMessages]

function messageHandler(message: DebugMessage | ForContent) {
	// FIXME: Make this efficient when the rest of the messages are sorted out
	if (isDebugMessage(message)) {
		if (DEBUG) {
			debugSendContent(`rx: ${message.name}`)  // FIXME: correct?
		}
		return
	}

	const { name, payload } = message

	switch (name) {
		case ForContentMessageName.GetLandmarks:
			// A GUI is requesting the list of landmarks on the page
			if (!doUpdateOutdatedResults()) sendLandmarks()
			break
		case ForContentMessageName.FocusLandmark:
			// Triggered by activating an item in a GUI, or indirectly via one
			// of the keyboard shortcuts (if landmarks are present)
			doUpdateOutdatedResults()
			guiCheckFocusElement(() =>
				landmarksFinder.getLandmarkElementInfo(payload.index))
			break
		case ForContentMessageName.ShowLandmark:
			handleHighlightMessage(
				payload.index,
				() => borderDrawer.addBorder(
					landmarksFinder.getLandmarkElementInfoWithoutUpdatingIndex(payload.index)
				))
			break
		case ForContentMessageName.HideLandmark:
			handleHighlightMessage(
				payload.index,
				() => borderDrawer.removeBorderOn(
					landmarksFinder.getLandmarkElementInfoWithoutUpdatingIndex(payload.index).element
				))
			break
		case ForContentMessageName.NextLandmark:
			// Triggered by keyboard shortcut
			doUpdateOutdatedResults()
			guiCheckFocusElement(() => landmarksFinder.getNextLandmarkElementInfo())
			break
		case ForContentMessageName.PrevLandmark:
			// Triggered by keyboard shortcut
			doUpdateOutdatedResults()
			guiCheckFocusElement(() => landmarksFinder.getPreviousLandmarkElementInfo())
			break
		case ForContentMessageName.MainLandmark: {
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
		case ForContentMessageName.ToggleAllLandmarks:
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
		case ForContentMessageName.GetToggleState:
			sendMessage(FromContentMessageName.ToggleStateIs,
				{ state: elementFocuser.isManagingBorders() ? 'selected' : 'all'})
			break
		case ForContentMessageName.TriggerRefresh:
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
				() => msr.incrementNonMutationScans(), () => msr.sendAllUpdates())
			highlightLastTouchTimes.clear()
			highlightTimeouts.clear()
			break
		case ForContentMessageName.DevToolsState:
			if (payload.state === 'open') {
				debugSendContent('change scanner to dev')
				landmarksFinder.useDevMode(true)
				msr.beVerbose()
			} else if (payload.state === 'closed') {
				debugSendContent('change scanner to std')
				landmarksFinder.useDevMode(false)
				msr.beQuiet()
			}
			if (!document.hidden) {
				debugSendContent('doc visible; scanning')
				findLandmarks(noop, noop)
			}
			break
		case ForContentMessageName.GetPageWarnings:
			sendMessage(FromContentMessageName.PageWarnings, landmarksFinder.pageResults() ?? [])
	}
}

function doUpdateOutdatedResults() {
	let outOfDate = false
	if (observerReconnectionScanTimer !== null) {
		debugSendContent('out-of-date: was awaiting reconnection; re-observing now')
		cancelObserverReconnectionScan()
		observeMutations()
		outOfDate = true
	} else if (pauseHandler.isPaused()) {
		debugSendContent('out-of-date: scanning pause > default')
		outOfDate = true
	}

	if (outOfDate === true) {
		findLandmarksAndSend(
			() => msr.incrementNonMutationScans(),
			noop)  // it already calls the send function
		return true
	}
	debugSendContent('landmarks are up-to-date')
	return false
}

function guiCheckThereAreLandmarks() {
	if (landmarksFinder.getNumberOfLandmarks() === 0) {
		alert(browser.i18n.getMessage('noLandmarksFound'))
		return false
	}
	return true
}

function guiCheckFocusElement(callbackReturningElementInfo: CallbackReturningElementInfo) {
	if (guiCheckThereAreLandmarks()) {
		elementFocuser.focusElement(callbackReturningElementInfo()!)
	}
}

function debugSendContent(what: string) {
	// When sending from a contenet script, the tab's ID will be noted by the
	// background script, so no need to specify a 'from' key here.
	void browser.runtime.sendMessage({ name: 'debug', info: what, from: 'content' } satisfies DebugMessage)
}


//
// Finding landmarks
//

function sendLandmarks() {
	sendMessage(FromContentMessageName.Landmarks, {
		tree: landmarksFinder.tree(),
		number: landmarksFinder.getNumberOfLandmarks()
	})
}

function findLandmarks(counterIncrementFunction: () => void, updateSendFunction: () => void) {
	if (DEBUG) console.timeStamp(`findLandmarks() on ${window.location.href}`)
	debugSendContent('finding landmarks')

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

function findLandmarksAndSend(counterIncrementFunction: () => void, updateSendFunction: () => void) {
	findLandmarks(counterIncrementFunction, updateSendFunction)
	sendLandmarks()
}


//
// Mutation observation
//

function shouldRefreshLandmarkss(mutations: MutationRecord[]) {
	for (const mutation of mutations) {
		if (mutation.type === 'childList') {
			for (const nodes of [mutation.addedNodes, mutation.removedNodes]) {
				for (const node of nodes) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						return true
					}
				}
			}
		} else if (mutation.type === 'attributes') {  // NOTE: Added this check; perf?
			if (mutation.attributeName === 'style') {
				if (/display|visibility/.test((mutation.target as Element).getAttribute('style')!)) {
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
			// FIXME: address this by some way other than ignoring
			// eslint-disable-next-line @typescript-eslint/unbound-method
			borderDrawer.hasMadeDOMChanges,
			// Guarded task
			function() {
				msr.incrementCheckedMutations()
				if (shouldRefreshLandmarkss(mutations)) {
					debugSendContent('scanning due to mutation')
					findLandmarksAndSend(() => msr.incrementMutationScans(), noop)
					// msr.sendMutationUpdate() called below
				}
			},
			// Scheduled task
			function() {
				debugSendContent('scheduled scan')
				findLandmarksAndSend(
					() => msr.incrementMutationScans(), () => msr.sendMutationUpdate())
			})

		msr.sendMutationUpdate()
	})
}

function observeMutations() {
	// FIXME: doesn't include roledescription
	observer?.observe(document, {
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
		clearTimeout(observerReconnectionScanTimer)
		observerReconnectionScanTimer = null
	}
}

function reflectPageVisibility() {
	debugSendContent((document.hidden ? 'hidden' : 'shown') + ' ' + String(window.location))
	if (document.hidden) {
		cancelObserverReconnectionScan()
		observer?.disconnect()
	} else {
		observerReconnectionScanTimer = setTimeout(function() {
			debugSendContent('page remained visible: observing and scanning')
			findLandmarksAndSend(
				() => msr.incrementNonMutationScans(), noop)  // it will send anyway
			observeMutations()
			observerReconnectionScanTimer = null
		}, observerReconnectionGrace)
	}
}


//
// Bootstrapping
//

function disconnectHandler() {
	console.log('Landmarks: content script disconnected ' +
		'due to extension unload/reload.')
	observer?.disconnect()
	document.removeEventListener('visibilitychange', reflectPageVisibility)
}

function startUpTasks() {
	document.addEventListener('visibilitychange', reflectPageVisibility)

	browser.runtime.onMessage.addListener(messageHandler)

	if (BROWSER !== 'firefox') {
		browser.runtime.connect({ name: 'disconnect-checker' })
			.onDisconnect.addListener(disconnectHandler)
	}

	browser.storage.onChanged.addListener(function(changes) {
		if ('guessLandmarks' in changes) {
			const setting = Boolean(changes.guessLandmarks.newValue) ??  // TODO: TS: check before and ignore?
				defaultFunctionalSettings.guessLandmarks
			if (setting !== changes.guessLandmarks.oldValue) {
				landmarksFinder.useHeuristics(setting)
				findLandmarks(noop, noop)
			}
		}

		if ('handleMutationsViaTree' in changes) {
			handleMutationsViaTree = Boolean(changes.handleMutationsViaTree.newValue) // TODO: check before and ignore?
			debugSendContent(`handle mutation via tree: ${handleMutationsViaTree}`)
		}
	})

	createMutationObserver()
	if (!document.hidden) {
		debugSendContent('document visible at startup; observing')
		observeMutations()
	}

	// Requesting the DevTools' state will eventually cause the correct scanner
	// to be set, the observer to be hooked up, and the document to be scanned,
	// if visible.
	sendMessage(FromContentMessageName.GetDevToolsState, null)
}

debugSendContent(`starting - ${window.location.toString()}`)
browser.storage.sync.get(defaultFunctionalSettings, function(items) {
	landmarksFinder.useHeuristics(items.guessLandmarks)
	handleMutationsViaTree = Boolean(items.handleMutationsViaTree)
	debugSendContent(`pre-startup: handle mutation via tree: ${handleMutationsViaTree}`)
	startUpTasks()
})
