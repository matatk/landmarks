'use strict'
/* global browser */

browser.devtools.panels.create(
	'Landmarks',
	'landmarks-32.png',
	'panel.html',
	function() {
		console.log('Landmarks DevTools panel created')
	})
