export default function disconnectingPortErrorCheck(disconnectedPort) {
	const portError = BROWSER === 'firefox'
		? disconnectedPort.error
		: browser.runtime.lastError

	if (portError) {
		throw Error(portError)
	}
}
