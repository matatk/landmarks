#!/usr/bin/env node
'use strict'

function convert(win, htmlRoot, jsonRoot) {
	if (!jsonRoot) jsonRoot = []
	for (let i = 0; i < htmlRoot.childNodes.length; i++) {
		const node = htmlRoot.childNodes[i]
		if (node.nodeType === win.Node.ELEMENT_NODE) {
			const jsonNode = {
				element: node.tagName.toLowerCase(),
				contains: convert(win, node, null)
			}
			jsonRoot.push(jsonNode)
		} else if (node.nodeType === win.Node.TEXT_NODE) {
			const content = node.nodeValue.trim()
			if (content.length > 0) {
				const jsonNode = { text: content }
				jsonRoot.push(jsonNode)
			}
		}
	}
	return jsonRoot
}

if (require.main === module) {
	// TODO loaded from commandline
} else {
	module.exports = convert
}
