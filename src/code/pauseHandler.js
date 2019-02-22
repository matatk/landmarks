export default function PauseHandler(afterUpdatePauseTime) {
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
		afterUpdatePauseTime(pause)
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
		console.timeStamp(`Decreased pause to: ${pause}`)
		afterUpdatePauseTime(pause)
	}

	function stopDecreasingPause() {
		if (decreasePauseTimeout) {
			clearTimeout(decreasePauseTimeout)
			decreasePauseTimeout = null
		}
	}


	//
	// Public API
	//

	this.run = function(ignoreCheck, guardedTask, scheduledTask) {
		if (ignoreCheck()) return

		const now = Date.now()
		if (now > lastEvent + pause) {
			guardedTask()
			lastEvent = now
		} else if (!haveIncreasedPauseAndScheduledTask) {
			increasePause()
			console.timeStamp(`Scheduling task in: ${pause}`)
			setTimeout(() => {
				scheduledTask()
				decreasePause()
				haveIncreasedPauseAndScheduledTask = false
			}, pause)
			haveIncreasedPauseAndScheduledTask = true
		}
	}

	this.getPauseTime = function() {
		return pause
	}
}
