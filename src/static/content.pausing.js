'use strict'
/* exported PauseHandler */

function PauseHandler() {
	//
	// Constants
	//

	const minPause = 500
	const maxPause = 60000
	const multiplier = 1.5
	const decrement = minPause
	const decreaseEvery = minPause * 2


	//
	// State
	//

	let pause = minPause
	let lastEvent = Date.now()
	let decreasePauseTimeout = null
	let haveIncreasedPauseAndScheduledTask = false
	let logging = false


	//
	// Reflecting options and Loggign
	//

	function log() {
		if (logging) {
			console.log.apply(null, arguments)
		}
	}

	function getDebugInfoOption() {
		browser.storage.sync.get({
			debugInfo: false
		}, function(items) {
			logging = items.debugInfo
		})
	}

	function handleOptionsChange(changes) {
		const changedOptions = Object.keys(changes)
		if (changedOptions.includes('debugInfo')) {
			logging = changes.debugInfo.newValue
		}
	}

	getDebugInfoOption()
	browser.storage.onChanged.addListener(handleOptionsChange)


	//
	// Private API
	//

	function increasePause() {
		stopDecreasingPause()
		pause = Math.floor(pause * multiplier)
		if (pause >= maxPause) {
			pause = maxPause
		}
		log('Increased pause to:', pause)
	}

	function decreasePause() {
		decreasePauseTimeout = setTimeout(_decreasePause, decreaseEvery)
	}

	function _decreasePause() {
		pause = Math.floor(pause - decrement)
		if (pause <= minPause) {
			pause = minPause
			decreasePauseTimeout = null
		} else {
			decreasePause()
		}
		log('Decreased pause to:', pause)
	}

	function stopDecreasingPause() {
		clearTimeout(decreasePauseTimeout)
		decreasePauseTimeout = null
		log('Stopped decreasing the pause')
	}


	//
	// Public API
	//

	this.run = function(guardedTask, scheduledTask) {
		const now = Date.now()
		if (now > lastEvent + pause) {
			log('SCAN mutation')
			guardedTask()
			lastEvent = now
		} else if (!haveIncreasedPauseAndScheduledTask) {
			increasePause()
			log('Scheduling scan in:', pause)
			setTimeout(() => {
				log('SCAN as scheduled')
				scheduledTask()
				decreasePause()
				haveIncreasedPauseAndScheduledTask = false
			}, pause)
			haveIncreasedPauseAndScheduledTask = true
		}
	}
}
