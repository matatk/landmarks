'use strict'
const para = document.createElement('p')
para.style.margin = 0
para.style.padding = '1em'
para.style.fontSize = '1.5em'
para.style.backgroundColor = 'black'
para.style.textAlign = 'center'
para.style.lineHeight = '1.5em'
para.style.fontWeight = 'bold'

const link = document.createElement('a')
link.href = '#'
link.onclick = function() {
	const port = browser.runtime.connect({ name: 'splash' })
	port.postMessage({
		name: 'open-help'
	})
	port.disconnect()
}
link.appendChild(document.createTextNode(
	"You've already got the Landmarks extension; visit the help page..."))
link.style.color = 'white'

para.appendChild(link)
if (document.body.firstChild.tagName === 'P') {
	document.body.firstChild.remove()
}
document.body.insertBefore(para, document.body.firstChild)
