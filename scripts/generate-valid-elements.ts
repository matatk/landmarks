import { globSync } from 'glob'
import { readFileSync, writeFileSync } from 'node:fs'

const htmlFiles = globSync('src/**/*.html')
const outFile = 'elements-that-exist.d.ts'

const findIds = /<(\w+).+?id="(.+?)"/g
const html = htmlFiles.reduce((acc, cur) => acc += readFileSync(cur), '')
const generalElements: Set<string> = new Set()
const inputElements: Set<string> = new Set()

let match: RegExpMatchArray | null
while (match = findIds.exec(html)) {
	if (match[1] === 'input') {
		inputElements.add(`'${match[2]}'`)
	} else {
		generalElements.add(`'${match[2]}'`)
	}
}

const intersect = new Set([...inputElements].filter(i => generalElements.has(i)));
if (intersect.size > 0) {
	console.error('The following IDs are in both the set of general and input elements:\n\t',
		Array.from(intersect).join('\n\t'))
	process.exit(42)
}

const output = `// NOTE: This file was automatically generated.

type GeneralElementsThatExist =
	${Array.from(generalElements).join(' |\n\t')}

type InputElementsThatExist =
	${Array.from(inputElements).join(' |\n\t')}

interface Document {
	getElementById(id: GeneralElementsThatExist): HTMLElement
	getElementById(id: InputElementsThatExist): HTMLInputElement
}`

writeFileSync(outFile, output)
console.log(outFile, 'written')
