'use strict'
const pssst = require('page-structural-semantics-scanner-tests')
const runner = pssst.runners.landmarks
const LandmarksFinder = require('./test-code-in-harness-landmarks')
runner(function(win, doc) {
	const lf = new LandmarksFinder(win, doc)
	lf.find()
	return lf.allDepthsRolesDescriptionsLabelsSelectors()
})
