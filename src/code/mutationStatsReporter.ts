import { MessageName, sendToExt } from './messages.js'

const LIMIT = 10

// TODO: make this like the mutation observer—disconnect when DevTools isn't
//       open? (Would need to manage expectations in that case.)
export default class MutationStatsReporter {
	// FIXME: Make these member vars private, matching BorderDrawer.
	totalMutations = 0
	checkedMutations = 0
	mutationScans = 0
	nonMutationScans = 0
	pauseTime?: number
	lastScanDuration?: number
	numScanDurationReports = 0  // TODO: harmonise with content scr.
	averageScanDuration = 0
	quiet = true

	mutationsPerSecond: number[] = []
	mutationsLimitSecondAverages: number[] = []
	mutationsInWindow = 0
	mutationsLastSecondCount = 0

	checkedPerSecond: number[] = []
	checkedLimitSecondAverages: number[] = []
	checkedInWindow = 0
	checkedLastSecondCount = 0

	constructor() {
		for (let i = 0; i < LIMIT; i++) {
			this.mutationsPerSecond.push(0)
			this.mutationsLimitSecondAverages.push(0)

			this.checkedPerSecond.push(0)
			this.checkedLimitSecondAverages.push(0)
		}

		// FIXME: try bind?
		setInterval(() => this.#updateLastTen(), 1e3)
	}


	//
	// Public API
	//

	reset() {
		this.totalMutations = 0
		this.checkedMutations = 0
		this.mutationScans = 0
		this.nonMutationScans = 0
		this.pauseTime = undefined
		this.lastScanDuration = undefined
	}

	beQuiet() {
		this.quiet = true
	}

	beVerbose() {
		this.quiet = false
		this.#sendAllUpdates()
	}

	incrementTotalMutations() {
		this.totalMutations += 1
		this.mutationsLastSecondCount += 1
	}

	incrementCheckedMutations() {
		this.checkedMutations += 1
		this.checkedLastSecondCount += 1
	}

	incrementMutationScans() {
		this.mutationScans += 1
	}

	incrementNonMutationScans() {
		this.nonMutationScans += 1
		if (!this.quiet) this.#sendNonMutationScansUpdate()
	}

	setPauseTime(time: number) {
		this.pauseTime = time
		if (!this.quiet) this.#sendPauseTimeUpdate()
	}

	setLastScanDuration(duration: number) {
		this.lastScanDuration = Math.round(duration)  // Chrome is precise
		this.averageScanDuration =
			(this.numScanDurationReports * this.averageScanDuration + this.lastScanDuration) /
			++this.numScanDurationReports
		if (!this.quiet) this.#sendDurationUpdate()
	}

	// Only these two public send methods are exposed because the mutation info
	// update consists of three things that are sent after each mutation, check
	// and possible scan. Also quite high-traffic perhaps, so cutting down on
	// the times this info is sent is important.

	sendMutationUpdate() {
		if (!this.quiet) this.#sendMutationUpdate()
	}

	sendAllUpdates() {
		if (!this.quiet) this.#sendAllUpdates()
	}


	//
	// Private API
	//

	#updateLastTen() {
		this.mutationsInWindow -= this.mutationsPerSecond.shift() ?? 0
		this.mutationsInWindow += this.mutationsLastSecondCount
		this.mutationsPerSecond.push(this.mutationsLastSecondCount)
		this.mutationsLastSecondCount = 0
		const mutationsAverage = this.mutationsInWindow / LIMIT
		this.mutationsLimitSecondAverages.shift()
		this.mutationsLimitSecondAverages.push(mutationsAverage)

		this.checkedInWindow -= this.checkedPerSecond.shift() ?? 0
		this.checkedInWindow += this.checkedLastSecondCount
		this.checkedPerSecond.push(this.checkedLastSecondCount)
		this.checkedLastSecondCount = 0
		const checkedAverage = this.checkedInWindow / LIMIT
		this.checkedLimitSecondAverages.shift()
		this.checkedLimitSecondAverages.push(checkedAverage)

		if (!this.quiet) {
			sendToExt(MessageName.MutationInfoWindow, {
				'mutations-per-second': this.mutationsPerSecond,
				'average-mutations': this.mutationsLimitSecondAverages,
				'checked-per-second': this.checkedPerSecond,
				'average-checked': this.checkedLimitSecondAverages
			})
		}
	}

	#sendMutationUpdate() {
		sendToExt(MessageName.MutationInfo, {
			'mutations': this.totalMutations,
			'checks': this.checkedMutations,
			'mutationScans': this.mutationScans
		})
	}

	#sendNonMutationScansUpdate() {
		sendToExt(MessageName.MutationInfo, {
			'nonMutationScans': this.nonMutationScans
		})
	}

	#sendPauseTimeUpdate() {
		sendToExt(MessageName.MutationInfo, {
			'pause': this.pauseTime
		})
	}

	#sendDurationUpdate() {
		sendToExt(MessageName.MutationInfo, {
			'duration': this.lastScanDuration,
			'average': this.averageScanDuration
		})
	}

	#sendAllUpdates() {
		this.#sendMutationUpdate()
		this.#sendNonMutationScansUpdate()
		this.#sendPauseTimeUpdate()
		this.#sendDurationUpdate()
	}
}
