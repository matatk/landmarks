export default function MutationStatsReporter() {
	let totalMutations = 0
	let checkedMutations = 0
	let mutationScans = 0
	let pauseTime = null
	let lastScanDuration = null

	let quiet = true


	//
	// Public API
	//

	this.reset = function() {
		totalMutations = 0
		checkedMutations = 0
		mutationScans = 0
		pauseTime = null
		lastScanDuration = null
	}

	this.beQuiet = function() {
		quiet = true
	}

	this.beVerbose = function() {
		quiet = false
		_sendAllUpdates()
	}

	this.incrementTotalMutations = function() {
		totalMutations += 1
	}

	this.incrementCheckedMutations = function() {
		checkedMutations += 1
	}

	this.incrementMutationScans = function() {
		mutationScans += 1
	}

	this.setPauseTime = function(time) {
		pauseTime = time
		if (!quiet) _sendPauseTimeUpdate()
	}

	this.setLastScanDuration = function(duration) {
		lastScanDuration = Math.round(duration)  // Chrome is precise
		if (!quiet) _sendDurationUpdate()
	}

	this.sendMutationUpdate = function() {
		if (!quiet) _sendMutationUpdate()
	}

	this.sendAllUpdates = function() {
		if (!quiet) _sendAllUpdates()
	}


	//
	// Private API
	//

	function _sendMutationUpdate() {
		browser.runtime.sendMessage({
			name: 'mutation-info', data: {
				'mutations': totalMutations,
				'checks': checkedMutations,
				'scans': mutationScans
			}
		})
	}

	function _sendPauseTimeUpdate() {
		browser.runtime.sendMessage({
			name: 'mutation-info', data: {
				'pause': pauseTime
			}
		})
	}

	function _sendDurationUpdate() {
		browser.runtime.sendMessage({
			name: 'mutation-info', data: {
				'duration': lastScanDuration
			}
		})
	}

	function _sendAllUpdates() {
		_sendMutationUpdate()
		_sendPauseTimeUpdate()
		_sendDurationUpdate()
	}
}
