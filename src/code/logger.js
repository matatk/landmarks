export default function Logger() {
	const that = this

	function getDebugInfoOption(callback) {
		browser.storage.sync.get({
			debugInfo: false
		}, function(items) {
			// We only define the log() function after successfully initing, so
			// as to trap any errant uses of the logger.
			handleOptionsChange({
				debugInfo: {
					newValue: items.debugInfo
				}
			})
			if (callback) {
				callback()
			}
		})
	}

	function handleOptionsChange(changes) {
		if (changes.hasOwnProperty('debugInfo')) {
			// Ensure the correct line number is reported
			// https://stackoverflow.com/a/32928812/1485308
			// https://stackoverflow.com/a/28668819/1485308
			if (changes.debugInfo.newValue === true) {
				that.log = console.log.bind(window.console)
			} else {
				that.log = function() {}
			}
		}
	}

	// We may wish to log messages right way, but the call to get the user
	// setting is asynchronous. Therefore, we need to pass our bootstrapping
	// code as a callback that is run when the option has been fetched.
	this.init = function(callback) {
		getDebugInfoOption(callback)
		browser.storage.onChanged.addListener(handleOptionsChange)
	}
}
