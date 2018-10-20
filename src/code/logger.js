import { defaultDebugSettings } from './defaults'

export default function Logger() {
	const that = this
	const messagesReceivedDuringInit = []

	this.log = function() {
		const args = ['Queued message:'].concat(Array.from(arguments))
		messagesReceivedDuringInit.push(args)
	}

	function getDebugInfoOption() {
		browser.storage.sync.get(defaultDebugSettings, function(items) {
			handleOptionsChange({
				debugInfo: {
					newValue: items.debugInfo
				}
			})
		})
	}

	function handleOptionsChange(changes) {
		if (changes.hasOwnProperty('debugInfo')) {
			// Ensure the correct line number is reported
			// https://stackoverflow.com/a/32928812/1485308
			// https://stackoverflow.com/a/28668819/1485308
			if (changes.debugInfo.newValue === true) {
				// We may have messages queued from whilst we were waiting for
				// the browser to retreive the user's preference
				if (messagesReceivedDuringInit.length > 0) {
					for (const messageArgs of messagesReceivedDuringInit) {
						console.log.apply(null, messageArgs)
					}
					messagesReceivedDuringInit.length = 0
				}
				that.log = console.log.bind(window.console)
			} else {
				// We may have messages queued from whilst we were waiting for
				// the browser to retreive the user's preference
				if (messagesReceivedDuringInit.length > 0) {
					messagesReceivedDuringInit.length = 0
				}
				that.log = function() {}
			}
		}
	}

	getDebugInfoOption()
	browser.storage.onChanged.addListener(handleOptionsChange)
}
