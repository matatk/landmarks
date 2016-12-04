'use strict'

const path = require('path');
const packageJson = require(path.join('..', 'package.json'));

const extName = packageJson.name;
const extVersion = packageJson.version;
const buildDir = 'build';
const srcStaticDir = path.join('src', 'static');
const srcAssembleDir = path.join('src', 'assemble');
const svgPath = path.join(srcAssembleDir, 'landmarks.svg');
const pngCacheDir = path.join(buildDir, 'png-cache');

const browserPngSizes = {
	'firefox': [
		18,  // Firefox (toolbar)
		32,  // Firefox (menu panel) + Chrome (Windows)
		36,  // Firefox (toolbar x2)
		48,  // Both    (general)
		64,  // Firefox (menu panel x2)
		96   // Firefox (general x2)
	],
	'chrome': [
		16,  // Chrome  (favicon)
		19,  // Chrome  (toolbar)
		32,  // Chrome  (Windows) + Firefox (menu panel)
		38,  // Chrome  (tooblar x2)
		48,  // Both    (general)
		128  // Chrome  (store)
	]
}

const fse = require('fs-extra');
const chalk = require('chalk');
const deepmerge = require('deepmerge');

const pngCache = require(path.join(__dirname, 'lib', 'png-cache.js'));
const pc = pngCache(pngCacheDir, svgPath);

const validBrowsers = Object.freeze([
	'firefox',
	'chrome'
])
const buildModes = Object.freeze(validBrowsers + ['all'])


// Log an error and exit
function error(message) {
	console.error(chalk.bold.red('✖ ' + message));
	process.exit(42);
}


// Log the start of a new step (styled)
function logStep(name) {
	console.log(chalk.underline(name));
}


// Check we got only one argument and it's valid; return list of builds to make
function checkBuildMode() {
	const args = process.argv.slice(2);

	if (args.length !== 1 || buildModes.indexOf(args[0]) == -1) {
		error(`Invalid build mode requested: expected one of [${buildModes}] but received '${args}'`);
	}

	if (args[0] == 'all') {
		return validBrowsers;
	}

	return args;
}


// Return path for extension in build folder
function pathToBuild(browser) {
	if (validBrowsers.indexOf(browser) !== -1) {
		return path.join(buildDir, browser);
	}

	error(`pathToBuild: invalid browser ${browser} given`);
}


// Copy static files
function copyStaticFiles(browser) {
	logStep('Copying static files...');
	fse.copySync(srcStaticDir, pathToBuild(browser));
}


// Merge the relevant manifests
function mergeManifest(browser) {
	logStep('Merging manifest.json...');
	const common = path.join('..', srcAssembleDir, 'manifest.common.json')
	const extra = path.join('..', srcAssembleDir, `manifest.${browser}.json`)
	const commonJson = require(common)
	const extraJson = require(extra)
	const merged = deepmerge(commonJson, extraJson)
	merged.version = extVersion
	fse.writeFileSync(
		path.join(pathToBuild(browser), 'manifest.json'),
		JSON.stringify(merged)
	)
	console.log(chalk.green(`✔ manifest.json written for ${browser}.`))
}


// Copy over background.js and (for Chrome) concat the extra bit
function copyBackgroundScript(browser) {
	logStep('Copying background script...');
	const basename = 'background.js'
	fse.copySync(
		path.join(srcAssembleDir, basename),
		path.join(pathToBuild(browser), basename))
	if (browser === 'chrome') {
		fse.appendFileSync(
			path.join(pathToBuild(browser), basename),
			fse.readFileSync(path.join(srcAssembleDir, 'background.chrome.js')));
	}
}


// Get PNG files from the cache (which will generate them if needed)
function getPngs(browser) {
	logStep(`Generating/copying in PNG files for ${browser}...`);
	browserPngSizes[browser].forEach((size) => {
		const pngPath = pc.getPngPath(size)
		const basename = path.basename(pngPath)
		fse.copySync(pngPath, path.join(pathToBuild(browser), basename));
	});
}


// Return the file name for the ZIP
function zipFileName(browser) {
	return extName + '-' + extVersion + '-' + browser + '.zip';
}


// Build process
const browsers = checkBuildMode();

console.log(chalk.bold(`Builing ${extName} ${extVersion}...`));

browsers.forEach((browser) => {
	console.log();
	console.log(chalk.bold.underline(`Building for ${browser}...`));

	copyStaticFiles(browser);
	mergeManifest(browser);
	copyBackgroundScript(browser);
	getPngs(browser);
});
