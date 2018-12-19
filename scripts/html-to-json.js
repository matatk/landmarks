#!/usr/bin/env node
'use strict'

function convert(win, htmlRoot, jsonRoot) {
	if (!jsonRoot) jsonRoot = []
	for (let i = 0; i < htmlRoot.childNodes.length; i++) {
		const node = htmlRoot.childNodes[i]
		if (node.nodeType === win.Node.ELEMENT_NODE) {
			const jsonElement = {
				element: node.tagName.toLowerCase(),
				contains: convert(win, node, null)
			}
			if (node.attributes.length > 0) {
				jsonElement.attributes = {}
				for (const attr of node.attributes) {
					jsonElement.attributes[attr.name] = attr.value
				}
			}
			jsonRoot.push(jsonElement)
		} else if (node.nodeType === win.Node.TEXT_NODE) {
			const content = node.nodeValue
			if (content.length > 0) {
				jsonRoot.push({ text: content })
			}
		}
	}
	return jsonRoot
}

if (require.main === module) {
	// TODO DRY wrt test runner
	const fs = require('fs')
	const jsdom = require('jsdom')
	const { JSDOM } = jsdom

	const html = fs.readFileSync(process.argv[2], 'utf-8')
		.replace(/\s*\n\s*/gm, '')

	const doc = new JSDOM(html).window.document
	const res = convert(
		doc.defaultView,
		doc.body,
		null)

	console.log(JSON.stringify(res, null, 2))
} else {
	module.exports = convert
}
