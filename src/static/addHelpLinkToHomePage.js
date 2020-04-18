'use strict'
const containerId = 'landmarks-extension-already-installed-help-info'
const leaderId = containerId + '-leader'

if (!document.getElementById(containerId)) {
	const style = document.createElement('style')
	document.head.appendChild(style)
	const sheet = style.sheet
	const selectorStart = `#${containerId} `
	sheet.insertRule(selectorStart + `{
		margin: 0;
		padding: 1rem;
		font-size: 1.5rem;
		background-color: black;
		text-align: center;
		line-height: 1.5em;
		font-weight: bold;
		border: 0.25rem solid white;
		color: white;
	}`)
	sheet.insertRule(selectorStart + 'a { color: white; }')
	sheet.insertRule(`
	${selectorStart} a:focus,
	${selectorStart} a:hover {
		background-color: #757575;
		outline-color: #757575;
	}`)

	const container = document.createElement('section')
	container.id = containerId

	const leader = document.createElement('p')
	leader.id = leaderId
	leader.textContent = "You've already got the Landmarks extension..."

	const para = document.createElement('p')

	const link = document.createElement('a')
	link.href = '#'
	link.onclick = function() {
		browser.runtime.sendMessage({ name: 'open-help', openInSameTab: true })
	}
	link.appendChild(document.createTextNode('Visit the help page'))

	para.appendChild(link)
	container.appendChild(leader)
	container.appendChild(para)
	container.setAttribute('aria-labelledby', leaderId)
	document.body.insertBefore(container, document.body.firstChild)
}
