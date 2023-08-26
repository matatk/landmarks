// http://tumble.jeremyhubert.com/post/7076881720
// HT http://stackoverflow.com/questions/25467009/
export default function translate() {
	for(const element of (document.querySelectorAll('[data-message]'))) {
		element.appendChild(document.createTextNode(
			// @ts-ignore FIXME
			browser.i18n.getMessage(element.dataset.message)))
	}
}
