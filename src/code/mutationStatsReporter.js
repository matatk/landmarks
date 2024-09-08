// TODO: make this like the mutation observer—disconnect when DevTools isn't
//       open? (Would need to manage expectations in that case.)
export default function MutationStatsReporter() {
	let totalMutations = 0
	let checkedMutations = 0
	let mutationScans = 0
	let nonMutationScans = 0
	let pauseTime = null
	let lastScanDuration = null
	let numScanDurationReports = 0  // TODO: harmonise with content scr.
	let averageScanDuration = 0
	let prettyAverageScanDuration = 0
	let quiet = true

	const LIMIT = 10

	const mutationsPerSecond = []
	const mutationsLimitSecondAverages = []
	let mutationsInWindow = 0
	let mutationsLastSecondCount = 0

	const checkedPerSecond = []
	const checkedLimitSecondAverages = []
	let checkedInWindow = 0
	let checkedLastSecondCount = 0

	for (let i = 0; i < LIMIT; i++) {
		mutationsPerSecond.push(0)
		mutationsLimitSecondAverages.push(0)

		checkedPerSecond.push(0)
		checkedLimitSecondAverages.push(0)
	}

	function updateLastTen() {
		const start = performance.now()
		mutationsInWindow -= mutationsPerSecond.shift()
		mutationsInWindow += mutationsLastSecondCount
		mutationsPerSecond.push(mutationsLastSecondCount)
		mutationsLastSecondCount = 0
		const mutationsAverage = mutationsInWindow / LIMIT
		mutationsLimitSecondAverages.shift()
		mutationsLimitSecondAverages.push(mutationsAverage)

		checkedInWindow -= checkedPerSecond.shift()
		checkedInWindow += checkedLastSecondCount
		checkedPerSecond.push(checkedLastSecondCount)
		checkedLastSecondCount = 0
		const checkedAverage = checkedInWindow / LIMIT
		checkedLimitSecondAverages.shift()
		checkedLimitSecondAverages.push(checkedAverage)

		if (!quiet) {
			browser.runtime.sendMessage({
				name: 'mutation-info-window', data: {
					'mutations-per-second': mutationsPerSecond,
					'average-mutations': mutationsLimitSecondAverages,
					'checked-per-second': checkedPerSecond,
					'average-checked': checkedLimitSecondAverages
				}
			})
		}
		// console.log('took:', performance.now() - start)
	}

	setInterval(updateLastTen, 1e3)


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
		mutationsLastSecondCount += 1
	}

	this.incrementCheckedMutations = function() {
		checkedMutations += 1
		checkedLastSecondCount += 1
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
		averageScanDuration =
			(numScanDurationReports * averageScanDuration + lastScanDuration) /
			++numScanDurationReports
		prettyAverageScanDuration = averageScanDuration.toFixed(1)
		if (!quiet) _sendDurationUpdate()
		if (!quiet) console.log('is last greater than average duration?', lastScanDuration > averageScanDuration)
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
				'duration': lastScanDuration,
				'average': prettyAverageScanDuration
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
