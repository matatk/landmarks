export default class MutationStatsReporter {
	constructor() {
		this.reset()
		this._quiet = true
	}

	reset() {
		this._totalMutations = 0
		this._checkedMutations = 0
		this._mutationScans = 0
		this._pauseTime = null
		this._lastScanDuration = null
	}

	beQuiet() {
		this._quiet = true
	}

	beVerbose() {
		this._quiet = false
		this._sendAllUpdates()
	}


	//
	// Counting
	//

	incrementTotalMutations() {
		this._totalMutations += 1
	}

	incrementCheckedMutations() {
		this._checkedMutations += 1
	}

	incrementMutationScans() {
		this._mutationScans += 1
	}

	set pauseTime(time) {
		this._pauseTime = time
		if (!this._quiet) this._sendPauseTimeUpdate()
	}

	set lastScanDuration(duration) {
		this._lastScanDuration = duration
		if (!this._quiet) this._sendDurationUpdate()
	}


	//
	// Sending stats
	//

	sendMutationUpdate() {
		if (!this._quiet) this._sendMutationUpdate()
	}

	_sendMutationUpdate() {
		browser.runtime.sendMessage({
			name: 'mutation-info', data: {
				'mutations': this._totalMutations,
				'checks': this._checkedMutations,
				'scans': this._mutationScans
			}
		})
	}

	_sendPauseTimeUpdate() {
		browser.runtime.sendMessage({
			name: 'mutation-info', data: {
				'pause': this._pauseTime
			}
		})
	}

	_sendDurationUpdate() {
		browser.runtime.sendMessage({
			name: 'mutation-info', data: {
				'duration': this._lastScanDuration
			}
		})
	}

	sendAllUpdates() {
		if (!this._quiet) this._sendAllUpdates()
	}

	_sendAllUpdates() {
		this._sendMutationUpdate()
		this._sendPauseTimeUpdate()
		this._sendDurationUpdate()
	}
}
