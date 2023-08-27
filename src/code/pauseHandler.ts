type PauseTimeHook = (pauseTime: number) => void

const minPause = 500
const maxPause = 60000
const multiplier = 1.5
const decrement = minPause
const decreaseEvery = minPause * 2

export default class PauseHandler {
	#pause: number = minPause
	#lastEvent: number = Date.now()
	#scheduledTaskTimeout: ReturnType<typeof setTimeout> | null = null
	#decreasePauseTimeout: ReturnType<typeof setTimeout> | null = null
	#haveIncreasedPauseAndScheduledTask = false
	#pauseTimeHook: PauseTimeHook

	constructor(pauseTimeHook: PauseTimeHook) {
		this.#pauseTimeHook = pauseTimeHook
		this.#pauseTimeHook(this.#pause)
	}

	#increasePause() {
		this.#stopDecreasingPause()
		this.#pause = Math.floor(this.#pause * multiplier)
		if (this.#pause >= maxPause) {
			this.#pause = maxPause
		}
		if (DEBUG) console.timeStamp(`Increased pause to: ${this.#pause}`)
		this.#pauseTimeHook(this.#pause)
	}

	#decreasePause() {
		this.#decreasePauseTimeout = setTimeout(() => this.#_decreasePause(), decreaseEvery)
	}

	#_decreasePause() {
		this.#pause = Math.floor(this.#pause - decrement)
		if (this.#pause <= minPause) {
			this.#pause = minPause
			this.#decreasePauseTimeout = null
		} else {
			this.#decreasePause()
		}
		if (DEBUG) console.timeStamp(`Decreased pause to: ${this.#pause}`)
		this.#pauseTimeHook(this.#pause)
	}

	#ceaseTimeout(timeout: ReturnType<typeof setTimeout> | null) {
		if (timeout) {
			clearTimeout(timeout)
			timeout = null
		}
	}

	// TODO: remove
	#stopDecreasingPause() {
		this.#ceaseTimeout(this.#decreasePauseTimeout)
	}

	// TODO: remove
	#cancelScheduledTask() {
		this.#ceaseTimeout(this.#scheduledTaskTimeout)
	}


	//
	// Public API
	//

	// TODO: would this be more efficient if tasks specified at init?
	run(ignoreCheck: () => boolean, guardedTask: () => void, scheduledTask: () => void) {
		if (ignoreCheck()) return

		const now = Date.now()
		if (now > this.#lastEvent + this.#pause) {
			guardedTask()
			this.#lastEvent = now
		} else if (!this.#haveIncreasedPauseAndScheduledTask) {
			this.#increasePause()
			if (DEBUG) console.timeStamp(`Scheduling task in: ${this.#pause}`)
			this.#scheduledTaskTimeout = setTimeout(() => {
				scheduledTask()
				this.#decreasePause()
				this.#haveIncreasedPauseAndScheduledTask = false
			}, this.#pause)
			this.#haveIncreasedPauseAndScheduledTask = true
		}
	}

	// TODO: getter?
	isPaused() {
		return this.#pause > minPause
	}

	reset() {
		this.#cancelScheduledTask()
		this.#stopDecreasingPause()
		this.#pause = minPause
	}
}
