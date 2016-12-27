/* eslint-disable strict */
/* global findLandmarks g_landmarkedElements filterLandmarks */
/* eslint-disable no-unused-vars */
let document
let Node

exports.testFindLandmarks = function(doc, window) {
	document = doc
	Node = window.Node
	findLandmarks()
	return filterLandmarks()
}
