import { defaultDebugSettings } from './defaults'

export default function Logger(win) {
	const that = this
	const messagesReceivedDuringInit = []  // whilst retrieving user preference

	this.log = function(message) {
		messagesReceivedDuringInit.push(`Queued message: ${message}`)
	}

	this.timeStamp = this.log

	function setDebugging(verbose) {
		if (verbose) {
			if (messagesReceivedDuringInit.length > 0) {
				for (const message of messagesReceivedDuringInit) {
					console.log(message)
				}
				messagesReceivedDuringInit.length = 0
			}
			// Ensure the correct line number is reported
			// https://stackoverflow.com/a/32928812/1485308
			// https://stackoverflow.com/a/28668819/1485308
			that.log = console.log.bind(win.console)
			that.timeStamp = console.timeStamp.bind(win.console)
		} else {
			if (messagesReceivedDuringInit.length > 0) {
				messagesReceivedDuringInit.length = 0
			}
			that.log = function() {}
			that.timeStamp = function() {}
		}
	}

	browser.storage.sync.get(defaultDebugSettings, function(items) {
		setDebugging(items.debugInfo)
	})

	browser.storage.onChanged.addListener(function(changes) {
		if (changes.hasOwnProperty('debugInfo')) {
			setDebugging(changes.debugInfo.newValue)
		}
	})
}
