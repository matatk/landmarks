import path from 'path'
import fs from 'fs'

import chalk from 'chalk'
import { minify } from 'terser'

export const srcAssembleDir = path.join('src', 'assemble')
export const srcCodeDir = path.join('src', 'code')

// Log the start of a new step (styled)
export function logStep(name) {
	console.log(chalk.underline(name + '...'))
}

export function makeTerserOptions(globals) {
	return {
		mangle: false,
		compress: {
			defaults: false,
			global_defs: globals, // eslint-disable-line camelcase
			conditionals: true,
			dead_code: true,      // eslint-disable-line camelcase
			evaluate: true,
			side_effects: true,   // eslint-disable-line camelcase
			switches: true,
			unused: true,
			passes: 2  // expand env vars; compresses their code
		},
		output: {
			beautify: true,
			braces: true,
			comments: true
			// Others may be relevant: https://github.com/fabiosantoscode/terser/issues/92#issuecomment-410442271
		}
	}
}

export async function makeLandmarksFinders(quiet) {
	if (!quiet) logStep('Creating the two landmarkFinder code versions')
	const sourceName = '_landmarksFinder.js'
	const sourcePath = path.join(srcAssembleDir, sourceName)

	for (const mode of ['standard', 'developer']) {
		const titleCaseMode = mode.charAt(0).toUpperCase() + mode.substr(1)
		const cachedName = `landmarksFinder${titleCaseMode}.js`
		const cachedPath = path.join(srcCodeDir, cachedName)
		const cachedScriptExists = fs.existsSync(cachedPath)
		const cachedScriptModified = cachedScriptExists
			? fs.statSync(cachedPath).mtime
			: null
		const sourceModified = fs.statSync(sourcePath).mtime

		if (!cachedScriptExists || sourceModified > cachedScriptModified) {
			console.log(chalk.bold.blue(
				`Bundling ${sourceName} as ${cachedName}...`))
			const source = fs.readFileSync(sourcePath, 'utf8')
			const result = await minify(
				source, makeTerserOptions({ MODE: mode }))
			fs.writeFileSync(cachedPath, result.code)
		} else if (!quiet) {
			console.log(chalk.bold.blue(`Using cached ${cachedName}`))
		}
	}
}
