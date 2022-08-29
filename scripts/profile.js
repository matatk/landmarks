#!/usr/bin/env node
import fse from 'fs-extra'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { cacheDir, urls } from './profile-lib/utils.js'
import { doLandmarkInsertionRuns } from './profile-lib/insertions.js'
import { doTraceWithAndWithoutGuarding } from './profile-lib/guarding.js'
import { doTimeLandmarksFinding } from './profile-lib/timing.js'

const debugBuildNote =
	'Remember to run this with a debug build of the extension (i.e. '
	+ '`node scripts/build.js --debug --browser chrome`).'


//
// Main and support
//

function main() {
	let mode

	const siteParameterDefinition = {
		describe: 'sites to scan',
		choices: ['all'].concat(Object.keys(urls))
	}

	const epilogue =
		`Valid sites:\n${JSON.stringify(urls, null, 2)}\n\n`
		+ '"all" can be specified to run the profile on each site.'

	const argv = yargs(hideBin(process.argv))
		.option('quiet', {
			alias: 'q',
			type: 'boolean',
			count: true,
			description: "(1) Don't print out browser console and request failed messages (do print errors); (2) Don't print out any browser messages (except unhandled exceptions); (3) Don't print out results AND don't write any results files (i.e. imples -F) when using the 'time' command."
		})
		.command(
			'trace <site> <landmarks> [runs]',
			'Run the built extension on a page and create a performance trace',
			yargs => {
				yargs
					.positional('site', siteParameterDefinition)
					.positional('landmarks', {
						describe:
						'number of landmarks to insert (there is a pause '
						+ 'between each)',
						type: 'number'
					})
					.coerce('landmarks', function(landmarks) {
						if (landmarks < 0) {
							throw Error(
								"Can't insert a negative number of landmarks")
						}
						return landmarks
					})
					.positional('runs', {
						describe:
						'number of separate tracing runs to make '
						+ '(recommend keeping this at one)',
						type: 'number',
						default: 1
					})
					.coerce('runs', function(runs) {
						if (runs < 1) {
							throw Error("Can't make less than one run")
						}
						return runs
					})
					.epilogue(epilogue)
			}, () => {
				mode = 'trace'
			})
		.command(
			'time <site> [repetitions]',
			'Runs only the LandmarksFinder code on a page',
			yargs => {
				yargs
					.option('scan', {
						alias: 's',
						type: 'boolean',
						description: 'Time scanning for landmarks'
					})
					.option('focus', {
						alias: 'f',
						type: 'boolean',
						description:
						'Time focusing the next and previous landmark'
					})
					.option('mutate', {
						alias: 'm',
						type: 'boolean',
						description: 'Time _and also check the results_ obtained when handling mutations specifically (refer to further notes below).'
					})
					.check(argv => {
						if (argv.scan || argv.focus || argv.mutate) {
							return true
						}
						throw Error(
							'You must request at least one of the timing tests;'
							+ ' check the help for details.')
					})
					.option('without-heuristics-too', {
						alias: 'w',
						type: 'boolean',
						description: 'Time scanning for landmarks _without_ heuristics as well as with heuristics'
					})
					.option('no-file-write', {
						alias: 'F',
						type: 'boolean',
						description: "Don't write any results files"
					})
					.positional('site', siteParameterDefinition)
					.positional('repetitions', {
						describe:
						'number of separate tracing repetitions to make',
						type: 'number',
						default: 100
					})
					.coerce('repetitions', function(repetitions) {
						if (repetitions < 1) {
							throw Error("Can't make less than one run")
						}
						return repetitions
					})
					.epilogue('NOTE: The results of mutation handling are checked against full scan results for the mutated page; the unit tests are still needed in order to verify that the full scan results for a given situation are correct. Checking of mutation handling is only done once for each specific mutation test.\n\n' + epilogue)
			}, () => {
				mode = 'time'
			})
		.command(
			'guarding',
			'Make a trace both with and without triggering mutation guarding. '
				+ debugBuildNote,
			() => {},
			() => {
				mode = 'guarding'
			})
		.help()
		.alias('help', 'h')
		.demandCommand(1, 'You must specify a command')
		.epilogue(epilogue)
		.argv

	const pages = argv.site === 'all' ? Object.keys(urls) : [argv.site]

	fse.ensureDirSync(cacheDir)

	switch (mode) {
		case 'trace':
			doLandmarkInsertionRuns(
				pages,
				argv.landmarks,
				argv.runs,
				argv.quiet)
			break
		case 'time':
			doTimeLandmarksFinding(
				pages,
				argv.repetitions,
				argv.scan,
				argv.focus,
				argv.mutate,
				argv.withoutHeuristicsToo,
				argv.quiet,
				argv.noFileWrite)
			break
		case 'guarding':
			doTraceWithAndWithoutGuarding(argv.quiet, debugBuildNote)
	}
}

main()
