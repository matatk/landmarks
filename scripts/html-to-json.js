#!/usr/bin/env node
'use strict'
const fs = require('fs')
const jsdom = require('jsdom')
const { JSDOM } = jsdom

function domToJson(win, htmlRoot, jsonRoot) {
	if (!jsonRoot) jsonRoot = []
	for (let i = 0; i < htmlRoot.childNodes.length; i++) {
		const node = htmlRoot.childNodes[i]
		if (node.nodeType === win.Node.ELEMENT_NODE) {
			const jsonElement = {
				element: node.tagName.toLowerCase(),
				contains: domToJson(win, node, null)
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

function convert(html, containerId) {
	if (typeof html !== 'string') throw Error('HTML code is not a string')
	if (containerId && typeof containerId !== 'string') {
		throw Error('IDREF is not a string')
	}

	const processed = html.replace(/\s*\n\s*/gm, '')
	const doc = new JSDOM(processed).window.document

	if (containerId && !doc.getElementById(containerId)) {
		throw Error(`Element with IDREF "${containerId}" not found.`)
	}

	const res = domToJson(
		doc.defaultView,
		containerId ? doc.getElementById(containerId) : doc.body,
		null)

	return res
}

function usageAndExit() {
	console.error('Usage: html-to-json.js <HTMLFile> [<IDREF>]')
	console.error('Converts the given <HTMLFile> to JSON and outputs the JSON.')
	console.error('If <IDREF> is given, start conversion from that element.')
	process.exit(42)
}

if (require.main === module) {
	if (!process.argv[2] || process.argv[2] === '-h') usageAndExit()
	console.log(JSON.stringify(convert(
		fs.readFileSync(process.argv[2], 'utf-8'), process.argv[3]), null, 2))
} else {
	module.exports = convert
}
