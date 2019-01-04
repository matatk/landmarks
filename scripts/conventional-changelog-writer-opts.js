'use strict'
// The aim of this is to use the Angular preset, but print out more types of commit message; thanks https://github.com/conventional-changelog/conventional-changelog/issues/317#issuecomment-390104826 :-)
// This file started off as https://github.com/conventional-changelog/conventional-changelog-angular/blob/master/index.js which doesn't have a licence, so is assumed to be in the public domain.
// TODO this seems to depend on the github-url-from-git package, but the current ngular preset doesn't; need to simplify if possible. The output differs a bit between this and angular in terms of which links are made into explicit links, so that may well be the crux of it.
const path = require('path')
let pkgJson = {}
const gufg = require('github-url-from-git')
try {
	pkgJson = require(path.resolve(
		process.cwd(),
		'./package.json'
	))
} catch (err) {
	console.error('no root package.json found')
}

function issueUrl() {
	if (pkgJson.repository && pkgJson.repository.url && ~pkgJson.repository.url.indexOf('github.com')) {  // eslint-disable-line no-bitwise
		const gitUrl = gufg(pkgJson.repository.url)

		if (gitUrl) {
			return gitUrl + '/issues/'
		}
	}
}

const writerOpts = {
	transform: function(commit) {
		const issues = []

		commit.notes.forEach(function(note) {
			note.title = 'BREAKING CHANGES'
		})

		if (commit.type === 'feat') {
			commit.type = 'Features'
		} else if (commit.type === 'fix') {
			commit.type = 'Bug Fixes'
		} else if (commit.type === 'perf') {
			commit.type = 'Performance Improvements'
		} else if (commit.type === 'revert') {
			commit.type = 'Reverts'
		} else if (commit.type === 'docs') {
			commit.type = 'Documentation'
		} else if (commit.type === 'style') {
			commit.type = 'Styles'
		} else if (commit.type === 'refactor') {
			commit.type = 'Code Refactoring'
		} else if (commit.type === 'test') {
			commit.type = 'Tests'
		} else if (commit.type === 'chore') {
			commit.type = 'Chores'
		} else if (commit.type === 'build') {
			commit.type = 'Build system'
		} else if (commit.type === null) {
			return
		}

		if (commit.scope === '*') {
			commit.scope = ''
		}

		if (typeof commit.hash === 'string') {
			commit.hash = commit.hash.substring(0, 7)
		}

		if (typeof commit.subject === 'string') {
			const url = issueUrl()
			if (url) {
				// GitHub issue URLs.
				commit.subject = commit.subject.replace(/#([0-9]+)/g, function(_, issue) {
					issues.push(issue)
					return '[#' + issue + '](' + url + issue + ')'
				})
			}
			// GitHub user URLs.
			commit.subject = commit.subject.replace(/@([a-zA-Z0-9_]+)/g, '[@$1](https://github.com/$1)')
		}

		// remove references that already appear in the subject
		commit.references = commit.references.filter(function(reference) {
			if (issues.indexOf(reference.issue) === -1) {
				return true
			}

			return false
		})

		return commit
	}
}

module.exports = {
	writerOpts: writerOpts
}
