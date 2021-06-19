// TODO: make this like the mutation observer—disconnect when DevTools isn't open?
export default function MutationStatsReporter() {
	let totalMutations = 0
	let checkedMutations = 0
	let mutationScans = 0
	let nonMutationScans = 0
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
		nonMutationScans = 0
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

	this.incrementNonMutationScans = function() {
		nonMutationScans += 1
		if (!quiet) _sendNonMutationScansUpdate()
	}

	this.setPauseTime = function(time) {
		pauseTime = time
		if (!quiet) _sendPauseTimeUpdate()
	}

	this.setLastScanDuration = function(duration) {
		lastScanDuration = Math.round(duration)  // Chrome is precise
		if (!quiet) _sendDurationUpdate()
	}

	// Only these two public send methods are exposed because the mutation info
	// update consists of three things that are sent after each mutation, check
	// and possible scan. Also quite high-traffic perhaps, so cutting down on
	// the times this info is sent is important.

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
				'mutationScans': mutationScans
			}
		})
	}

	function _sendNonMutationScansUpdate() {
		browser.runtime.sendMessage({
			name: 'mutation-info', data: {
				'nonMutationScans': nonMutationScans
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
		_sendNonMutationScansUpdate()
		_sendPauseTimeUpdate()
		_sendDurationUpdate()
	}
}
