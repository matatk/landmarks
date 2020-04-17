/* eslint-disable no-prototype-builtins */
'use strict'
const test = require('ava')
const MigrationManager = require('./generated-migration-manager.js')

test('test the damage report machine', t => {
	t.pass('damage report machine intact')
})

test('test one field-adding migration (implied v0)', t => {
	const settings = {}
	const migrations = {
		1: function(settings) {
			settings['newSetting'] = true
		}
	}
	const migrationManager = new MigrationManager(migrations)
	migrationManager.migrate(settings)
	t.is(settings.version, 1, 'bumped version')
	t.is(settings.newSetting, true, 'added new setting')
})

test('test removing a field (explicit version number)', t => {
	const settings = {
		'version': 42,
		'deprecatedSetting': 'orange'
	}
	const migrations = {
		43: function(settings) {
			delete settings.deprecatedSetting
		}
	}
	const migrationManager = new MigrationManager(migrations)
	migrationManager.migrate(settings)
	t.is(settings.version, 43, 'bumped version')
	t.is(
		settings.hasOwnProperty('deprecatedSetting'), false, 'removed setting')
})

test('test two migrations (explicit v0)', t => {
	const settings = { 'version': 0 }
	const migrations = {
		1: function(settings) {
			settings['newSetting'] = true
		},
		2: function(settings) {
			settings['newNewSetting'] = true
		}
	}
	const migrationManager = new MigrationManager(migrations)
	migrationManager.migrate(settings)
	t.is(settings.version, 2, 'got latest version')
	t.is(settings.newSetting, true, 'added new setting')
	t.is(settings.newNewSetting, true, 'added new new setting')
})

test('test two migrations, only one needed, error path', t => {
	// We're saying that we're starting with settings version 1, but we aren't.
	const settings = { 'version': 1 }
	const migrations = {
		1: function(settings) {
			settings['newSetting'] = true
		},
		2: function(settings) {
			settings['newNewSetting'] = true
		}
	}
	const migrationManager = new MigrationManager(migrations)
	migrationManager.migrate(settings)
	t.is(settings.version, 2, 'got latest version')
	t.is(settings.newSetting, undefined, "didn't run migration 1")
	t.is(settings.newNewSetting, true, 'added new new setting')
})

test('test returns false when migration not necessary', t => {
	const settings = { version: 1 }
	const migrations = {
		1: function() {
			throw new Error('This should not be run')
		}
	}
	const migrationManager = new MigrationManager(migrations)
	const result = migrationManager.migrate(settings)
	t.is(result, false, 'migration not needed')
})

test('test returns true when migration is necessary', t => {
	const settings = {}
	const migrations = {
		1: function() {}
	}
	const migrationManager = new MigrationManager(migrations)
	const result = migrationManager.migrate(settings)
	t.is(result, true, 'migration was needed')
})
