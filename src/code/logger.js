import { defaultDebugSettings } from './defaults'

export default function Logger() {
	const that = this

	this.log = function() {
		const args = ['@@'].concat(Array.from(arguments))  // TODO quieten
		console.log.apply(null, args)
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
				that.log = console.log.bind(window.console)
			} else {
				that.log = function() {}
			}
		}
	}

	getDebugInfoOption()
	browser.storage.onChanged.addListener(handleOptionsChange)
}
