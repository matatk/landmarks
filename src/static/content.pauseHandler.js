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


	//
	// Private API
	//

	function increasePause() {
		stopDecreasingPause()
		pause = Math.floor(pause * multiplier)
		if (pause >= maxPause) {
			pause = maxPause
		}
		console.log('Increased pause to:', pause)
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
		console.log('Decreased pause to:', pause)
	}

	function stopDecreasingPause() {
		clearTimeout(decreasePauseTimeout)
		decreasePauseTimeout = null
		console.log('Stopped decreasing the pause')
	}


	//
	// Public API
	//

	console.log('PAUSE HELPER CREATED')

	this.run = function(guardedTask, scheduledTask) {
		const now = Date.now()
		if (now > lastEvent + pause) {
			console.log('SCAN mutation')
			guardedTask()
			lastEvent = now
		} else if (!haveIncreasedPauseAndScheduledTask) {
			increasePause()
			console.log('Scheduling scan in:', pause)
			setTimeout(() => {
				console.log('SCAN as scheduled')
				scheduledTask()
				decreasePause()
				haveIncreasedPauseAndScheduledTask = false
			}, pause)
			haveIncreasedPauseAndScheduledTask = true
		}
	}
}
